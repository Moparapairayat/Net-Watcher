package dnslookup

import (
	"context"
	"errors"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/miekg/dns"
)

const DefaultTimeout = 3 * time.Second

type Config struct {
	Timeout time.Duration
}

type StringSection struct {
	Values     []string `json:"values,omitempty"`
	Error      string   `json:"error,omitempty"`
	DurationMs float64  `json:"duration_ms"`
}

type MXRecord struct {
	Host string `json:"host"`
	Pref uint16 `json:"pref"`
}

type MXSection struct {
	Records    []MXRecord `json:"records,omitempty"`
	Error      string     `json:"error,omitempty"`
	DurationMs float64    `json:"duration_ms"`
}

type SOARecord struct {
	NS      string `json:"ns"`
	MBox    string `json:"mbox"`
	Serial  uint32 `json:"serial"`
	Refresh uint32 `json:"refresh"`
	Retry   uint32 `json:"retry"`
	Expire  uint32 `json:"expire"`
	MinTTL  uint32 `json:"minttl"`
}

type SOASection struct {
	Record     *SOARecord `json:"record,omitempty"`
	Error      string     `json:"error,omitempty"`
	DurationMs float64    `json:"duration_ms"`
}

type SRVRecord struct {
	Target   string `json:"target"`
	Port     uint16 `json:"port"`
	Priority uint16 `json:"priority"`
	Weight   uint16 `json:"weight"`
}

type SRVSection struct {
	Records    []SRVRecord `json:"records,omitempty"`
	Error      string      `json:"error,omitempty"`
	DurationMs float64     `json:"duration_ms"`
}

type CAARecord struct {
	Flag  uint8  `json:"flag"`
	Tag   string `json:"tag"`
	Value string `json:"value"`
}

type CAASection struct {
	Records    []CAARecord `json:"records,omitempty"`
	Error      string      `json:"error,omitempty"`
	DurationMs float64     `json:"duration_ms"`
}

type ReverseRecord struct {
	Address    string   `json:"address"`
	Names      []string `json:"names,omitempty"`
	Error      string   `json:"error,omitempty"`
	DurationMs float64  `json:"duration_ms"`
}

type Summary struct {
	Addresses      int     `json:"addresses"`
	ReverseLookups int     `json:"reverse_lookups"`
	TotalRecords   int     `json:"total_records"`
	DurationMs     float64 `json:"duration_ms"`
}

type Report struct {
	Protocol string          `json:"protocol"`
	Target   string          `json:"target"`
	Kind     string          `json:"kind"`
	A        StringSection   `json:"a"`
	AAAA     StringSection   `json:"aaaa"`
	CNAME    StringSection   `json:"cname"`
	NS       StringSection   `json:"ns"`
	TXT      StringSection   `json:"txt"`
	MX       MXSection       `json:"mx"`
	SOA      SOASection      `json:"soa"`
	SRV      SRVSection      `json:"srv"`
	CAA      CAASection      `json:"caa"`
	PTR      []ReverseRecord `json:"ptr,omitempty"`
	Summary  Summary         `json:"summary"`
}

var (
	lookupIPv4 = func(ctx context.Context, host string) ([]net.IP, error) {
		return net.DefaultResolver.LookupIP(ctx, "ip4", host)
	}
	lookupIPv6 = func(ctx context.Context, host string) ([]net.IP, error) {
		return net.DefaultResolver.LookupIP(ctx, "ip6", host)
	}
	lookupCNAME = net.DefaultResolver.LookupCNAME
	lookupNS    = net.DefaultResolver.LookupNS
	lookupMX    = net.DefaultResolver.LookupMX
	lookupTXT   = net.DefaultResolver.LookupTXT
	lookupAddr  = net.DefaultResolver.LookupAddr
	lookupRRs   = lookupDNSRecords
)

func Run(target string, cfg Config) (Report, error) {
	return RunContext(context.Background(), target, cfg)
}

func RunContext(ctx context.Context, target string, cfg Config) (Report, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	target = strings.TrimSpace(target)
	if target == "" {
		return Report{}, errors.New("target is required")
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = DefaultTimeout
	}

	report := Report{
		Protocol: "dns",
		Target:   target,
	}
	started := time.Now()

	if ip := net.ParseIP(target); ip != nil {
		report.Kind = "ip"
		report.PTR = []ReverseRecord{lookupReverse(ctx, ip.String(), cfg.Timeout)}
		report.Summary = buildSummary(report, time.Since(started))
		return report, nil
	}

	report.Kind = "host"

	var wg sync.WaitGroup
	wg.Add(9)

	go func() {
		defer wg.Done()
		report.A = lookupStringValues(ctx, cfg.Timeout, func(callCtx context.Context) ([]string, error) {
			ips, err := lookupIPv4(callCtx, target)
			if err != nil {
				return nil, err
			}
			return ipStrings(ips), nil
		})
	}()

	go func() {
		defer wg.Done()
		report.AAAA = lookupStringValues(ctx, cfg.Timeout, func(callCtx context.Context) ([]string, error) {
			ips, err := lookupIPv6(callCtx, target)
			if err != nil {
				return nil, err
			}
			return ipStrings(ips), nil
		})
	}()

	go func() {
		defer wg.Done()
		report.CNAME = lookupStringValues(ctx, cfg.Timeout, func(callCtx context.Context) ([]string, error) {
			value, err := lookupCNAME(callCtx, target)
			if err != nil {
				return nil, err
			}
			value = trimDNSDot(strings.TrimSpace(value))
			if value == "" {
				return nil, nil
			}
			return []string{value}, nil
		})
	}()

	go func() {
		defer wg.Done()
		report.NS = lookupStringValues(ctx, cfg.Timeout, func(callCtx context.Context) ([]string, error) {
			records, err := lookupNS(callCtx, target)
			if err != nil {
				return nil, err
			}
			values := make([]string, 0, len(records))
			for _, record := range records {
				values = append(values, trimDNSDot(strings.TrimSpace(record.Host)))
			}
			return values, nil
		})
	}()

	go func() {
		defer wg.Done()
		report.MX = lookupMXValues(ctx, cfg.Timeout, target)
	}()

	go func() {
		defer wg.Done()
		report.TXT = lookupStringValues(ctx, cfg.Timeout, func(callCtx context.Context) ([]string, error) {
			records, err := lookupTXT(callCtx, target)
			if err != nil {
				return nil, err
			}
			return normalizeStrings(records), nil
		})
	}()

	go func() {
		defer wg.Done()
		report.SOA = lookupSOAValue(ctx, cfg.Timeout, target)
	}()

	go func() {
		defer wg.Done()
		report.SRV = lookupSRVValues(ctx, cfg.Timeout, target)
	}()

	go func() {
		defer wg.Done()
		report.CAA = lookupCAAValues(ctx, cfg.Timeout, target)
	}()

	wg.Wait()

	addresses := normalizeStrings(append(append([]string{}, report.A.Values...), report.AAAA.Values...))
	if len(addresses) > 0 {
		report.PTR = make([]ReverseRecord, len(addresses))
		var ptrWG sync.WaitGroup
		ptrWG.Add(len(addresses))
		for i, addr := range addresses {
			go func(index int, ip string) {
				defer ptrWG.Done()
				report.PTR[index] = lookupReverse(ctx, ip, cfg.Timeout)
			}(i, addr)
		}
		ptrWG.Wait()
	}

	report.Summary = buildSummary(report, time.Since(started))
	if report.Summary.TotalRecords == 0 && report.Kind == "host" {
		if firstErr := firstSectionError(report); firstErr != "" {
			return report, fmt.Errorf("dns lookup failed: %s", firstErr)
		}
	}
	return report, nil
}

func lookupStringValues(ctx context.Context, timeout time.Duration, fn func(context.Context) ([]string, error)) StringSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	values, err := fn(callCtx)
	section := StringSection{
		DurationMs: durationMS(time.Since(started)),
		Values:     normalizeStrings(values),
	}
	if err != nil {
		section.Error = err.Error()
	}
	return section
}

func lookupMXValues(ctx context.Context, timeout time.Duration, target string) MXSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	records, err := lookupMX(callCtx, target)
	section := MXSection{DurationMs: durationMS(time.Since(started))}
	if err != nil {
		section.Error = err.Error()
		return section
	}
	section.Records = make([]MXRecord, 0, len(records))
	for _, record := range records {
		section.Records = append(section.Records, MXRecord{
			Host: trimDNSDot(strings.TrimSpace(record.Host)),
			Pref: record.Pref,
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Pref == section.Records[j].Pref {
			return section.Records[i].Host < section.Records[j].Host
		}
		return section.Records[i].Pref < section.Records[j].Pref
	})
	return section
}

func lookupSOAValue(ctx context.Context, timeout time.Duration, target string) SOASection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	records, err := lookupRRs(callCtx, target, dns.TypeSOA)
	section := SOASection{DurationMs: durationMS(time.Since(started))}
	if err != nil {
		section.Error = err.Error()
		return section
	}
	for _, record := range records {
		soa, ok := record.(*dns.SOA)
		if !ok {
			continue
		}
		section.Record = &SOARecord{
			NS:      trimDNSDot(strings.TrimSpace(soa.Ns)),
			MBox:    trimDNSDot(strings.TrimSpace(soa.Mbox)),
			Serial:  soa.Serial,
			Refresh: soa.Refresh,
			Retry:   soa.Retry,
			Expire:  soa.Expire,
			MinTTL:  soa.Minttl,
		}
		break
	}
	return section
}

func lookupSRVValues(ctx context.Context, timeout time.Duration, target string) SRVSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	records, err := lookupRRs(callCtx, target, dns.TypeSRV)
	section := SRVSection{DurationMs: durationMS(time.Since(started))}
	if err != nil {
		section.Error = err.Error()
		return section
	}
	for _, record := range records {
		srv, ok := record.(*dns.SRV)
		if !ok {
			continue
		}
		section.Records = append(section.Records, SRVRecord{
			Target:   trimDNSDot(strings.TrimSpace(srv.Target)),
			Port:     srv.Port,
			Priority: srv.Priority,
			Weight:   srv.Weight,
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Priority == section.Records[j].Priority {
			if section.Records[i].Weight == section.Records[j].Weight {
				if section.Records[i].Port == section.Records[j].Port {
					return section.Records[i].Target < section.Records[j].Target
				}
				return section.Records[i].Port < section.Records[j].Port
			}
			return section.Records[i].Weight < section.Records[j].Weight
		}
		return section.Records[i].Priority < section.Records[j].Priority
	})
	return section
}

func lookupCAAValues(ctx context.Context, timeout time.Duration, target string) CAASection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	records, err := lookupRRs(callCtx, target, dns.TypeCAA)
	section := CAASection{DurationMs: durationMS(time.Since(started))}
	if err != nil {
		section.Error = err.Error()
		return section
	}
	for _, record := range records {
		caa, ok := record.(*dns.CAA)
		if !ok {
			continue
		}
		section.Records = append(section.Records, CAARecord{
			Flag:  caa.Flag,
			Tag:   strings.TrimSpace(caa.Tag),
			Value: strings.TrimSpace(caa.Value),
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Tag == section.Records[j].Tag {
			if section.Records[i].Value == section.Records[j].Value {
				return section.Records[i].Flag < section.Records[j].Flag
			}
			return section.Records[i].Value < section.Records[j].Value
		}
		return section.Records[i].Tag < section.Records[j].Tag
	})
	return section
}

func lookupReverse(ctx context.Context, addr string, timeout time.Duration) ReverseRecord {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	record := ReverseRecord{Address: addr}
	names, err := lookupAddr(callCtx, addr)
	record.DurationMs = durationMS(time.Since(started))
	if err != nil {
		record.Error = err.Error()
		return record
	}
	record.Names = normalizeStrings(names)
	return record
}

func lookupDNSRecords(ctx context.Context, name string, qtype uint16) ([]dns.RR, error) {
	client := &dns.Client{}
	msg := &dns.Msg{}
	msg.SetQuestion(dns.Fqdn(strings.TrimSpace(name)), qtype)

	for _, server := range dnsServers() {
		response, _, err := client.ExchangeContext(ctx, msg, server)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			continue
		}
		if response == nil {
			continue
		}
		if response.Rcode != dns.RcodeSuccess {
			return nil, fmt.Errorf("dns query failed: %s", dns.RcodeToString[response.Rcode])
		}
		if len(response.Answer) == 0 {
			return nil, nil
		}
		return response.Answer, nil
	}
	return nil, fmt.Errorf("dns query failed: no resolver response")
}

func dnsServers() []string {
	if cfg, err := dns.ClientConfigFromFile("/etc/resolv.conf"); err == nil && cfg != nil {
		servers := make([]string, 0, len(cfg.Servers))
		for _, server := range cfg.Servers {
			server = strings.TrimSpace(server)
			if server == "" {
				continue
			}
			if _, _, err := net.SplitHostPort(server); err == nil {
				servers = append(servers, server)
				continue
			}
			port := cfg.Port
			if strings.TrimSpace(port) == "" {
				port = "53"
			}
			servers = append(servers, net.JoinHostPort(server, port))
		}
		if len(servers) > 0 {
			return servers
		}
	}
	return []string{"1.1.1.1:53", "8.8.8.8:53"}
}

func ipStrings(ips []net.IP) []string {
	values := make([]string, 0, len(ips))
	for _, ip := range ips {
		if ip == nil {
			continue
		}
		values = append(values, ip.String())
	}
	return values
}

func normalizeStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		value = trimDNSDot(strings.TrimSpace(value))
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
	}
	sort.Strings(normalized)
	return normalized
}

func trimDNSDot(value string) string {
	return strings.TrimSuffix(value, ".")
}

func durationMS(d time.Duration) float64 {
	return float64(d) / float64(time.Millisecond)
}

func buildSummary(report Report, duration time.Duration) Summary {
	addresses := normalizeStrings(append(append([]string{}, report.A.Values...), report.AAAA.Values...))
	totalRecords := len(report.A.Values) + len(report.AAAA.Values) + len(report.CNAME.Values) + len(report.NS.Values) + len(report.TXT.Values) + len(report.MX.Records) + len(report.SRV.Records) + len(report.CAA.Records)
	if report.SOA.Record != nil {
		totalRecords++
	}
	reverseLookups := 0
	for _, ptr := range report.PTR {
		reverseLookups += len(ptr.Names)
	}
	totalRecords += reverseLookups
	return Summary{
		Addresses:      len(addresses),
		ReverseLookups: reverseLookups,
		TotalRecords:   totalRecords,
		DurationMs:     durationMS(duration),
	}
}

func firstSectionError(report Report) string {
	for _, errText := range []string{report.A.Error, report.AAAA.Error, report.CNAME.Error, report.NS.Error, report.MX.Error, report.TXT.Error, report.SOA.Error, report.SRV.Error, report.CAA.Error} {
		if strings.TrimSpace(errText) != "" {
			return errText
		}
	}
	return ""
}
