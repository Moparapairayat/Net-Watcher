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
	Timeout    time.Duration
	RecordType string
	Resolver   string
}

type StringRecord struct {
	Value string `json:"value"`
	TTL   uint32 `json:"ttl"`
}

type StringSection struct {
	Values        []string       `json:"values,omitempty"`
	Records       []StringRecord `json:"records,omitempty"`
	Error         string         `json:"error,omitempty"`
	DurationMs    float64        `json:"duration_ms"`
	Resolver      string         `json:"resolver,omitempty"`
	Authoritative bool           `json:"authoritative,omitempty"`
}

type MXRecord struct {
	Host string `json:"host"`
	Pref uint16 `json:"pref"`
	TTL  uint32 `json:"ttl"`
}

type MXSection struct {
	Records       []MXRecord `json:"records,omitempty"`
	Error         string     `json:"error,omitempty"`
	DurationMs    float64    `json:"duration_ms"`
	Resolver      string     `json:"resolver,omitempty"`
	Authoritative bool       `json:"authoritative,omitempty"`
}

type SOARecord struct {
	NS      string `json:"ns"`
	MBox    string `json:"mbox"`
	Serial  uint32 `json:"serial"`
	Refresh uint32 `json:"refresh"`
	Retry   uint32 `json:"retry"`
	Expire  uint32 `json:"expire"`
	MinTTL  uint32 `json:"minttl"`
	TTL     uint32 `json:"ttl"`
}

type SOASection struct {
	Record        *SOARecord `json:"record,omitempty"`
	Error         string     `json:"error,omitempty"`
	DurationMs    float64    `json:"duration_ms"`
	Resolver      string     `json:"resolver,omitempty"`
	Authoritative bool       `json:"authoritative,omitempty"`
}

type SRVRecord struct {
	Target   string `json:"target"`
	Port     uint16 `json:"port"`
	Priority uint16 `json:"priority"`
	Weight   uint16 `json:"weight"`
	TTL      uint32 `json:"ttl"`
}

type SRVSection struct {
	Records       []SRVRecord `json:"records,omitempty"`
	Error         string      `json:"error,omitempty"`
	DurationMs    float64     `json:"duration_ms"`
	Resolver      string      `json:"resolver,omitempty"`
	Authoritative bool        `json:"authoritative,omitempty"`
}

type CAARecord struct {
	Flag  uint8  `json:"flag"`
	Tag   string `json:"tag"`
	Value string `json:"value"`
	TTL   uint32 `json:"ttl"`
}

type CAASection struct {
	Records       []CAARecord `json:"records,omitempty"`
	Error         string      `json:"error,omitempty"`
	DurationMs    float64     `json:"duration_ms"`
	Resolver      string      `json:"resolver,omitempty"`
	Authoritative bool        `json:"authoritative,omitempty"`
}

type ReverseRecord struct {
	Address       string         `json:"address"`
	Names         []string       `json:"names,omitempty"`
	Records       []StringRecord `json:"records,omitempty"`
	Error         string         `json:"error,omitempty"`
	DurationMs    float64        `json:"duration_ms"`
	Resolver      string         `json:"resolver,omitempty"`
	Authoritative bool           `json:"authoritative,omitempty"`
}

type Analysis struct {
	SPFPresent    bool `json:"spf_present"`
	DMARCPresent  bool `json:"dmarc_present"`
	MXPresent     bool `json:"mx_present"`
	CAAPresent    bool `json:"caa_present"`
	DNSKEYPresent bool `json:"dnskey_present"`
	DSPresent     bool `json:"ds_present"`
	RRSIGPresent  bool `json:"rrsig_present"`
	DNSSECPresent bool `json:"dnssec_present"`
	MailReady     bool `json:"mail_ready"`
}

type Summary struct {
	Addresses      int     `json:"addresses"`
	ReverseLookups int     `json:"reverse_lookups"`
	TotalRecords   int     `json:"total_records"`
	DurationMs     float64 `json:"duration_ms"`
}

type Report struct {
	Protocol   string          `json:"protocol"`
	Target     string          `json:"target"`
	Kind       string          `json:"kind"`
	RecordType string          `json:"record_type"`
	Resolver   string          `json:"resolver"`
	A          StringSection   `json:"a"`
	AAAA       StringSection   `json:"aaaa"`
	CNAME      StringSection   `json:"cname"`
	NS         StringSection   `json:"ns"`
	TXT        StringSection   `json:"txt"`
	DMARC      StringSection   `json:"dmarc"`
	MX         MXSection       `json:"mx"`
	SOA        SOASection      `json:"soa"`
	SRV        SRVSection      `json:"srv"`
	CAA        CAASection      `json:"caa"`
	DNSKEY     StringSection   `json:"dnskey"`
	DS         StringSection   `json:"ds"`
	RRSIG      StringSection   `json:"rrsig"`
	PTR        []ReverseRecord `json:"ptr,omitempty"`
	Analysis   Analysis        `json:"analysis"`
	Summary    Summary         `json:"summary"`
}

type rrLookupResult struct {
	Answer        []dns.RR
	Resolver      string
	Authoritative bool
}

var lookupRRs = lookupDNSRecords

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

	recordType, err := normalizeRecordType(cfg.RecordType)
	if err != nil {
		return Report{}, err
	}
	resolver, err := normalizeResolver(cfg.Resolver)
	if err != nil {
		return Report{}, err
	}

	report := Report{
		Protocol:   "dns",
		Target:     target,
		RecordType: displayRecordType(recordType),
		Resolver:   displayResolver(resolver),
	}
	started := time.Now()

	if ip := net.ParseIP(target); ip != nil {
		if recordType != "all" && recordType != "ptr" {
			return Report{}, fmt.Errorf("record type %s requires a hostname target", displayRecordType(recordType))
		}
		report.Kind = "ip"
		report.PTR = []ReverseRecord{lookupReverse(ctx, ip.String(), cfg.Timeout, resolver)}
		report.Analysis = buildAnalysis(report)
		report.Summary = buildSummary(report, time.Since(started))
		if report.Summary.TotalRecords == 0 {
			if firstErr := firstSectionError(report); firstErr != "" {
				return report, fmt.Errorf("dns lookup failed: %s", firstErr)
			}
		}
		return report, nil
	}

	report.Kind = "host"
	var wg sync.WaitGroup

	if shouldQuery(recordType, "a") || recordType == "ptr" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.A = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeA, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.A)
				if !ok || record.A == nil {
					return StringRecord{}, false
				}
				return StringRecord{Value: record.A.String(), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "aaaa") || recordType == "ptr" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.AAAA = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeAAAA, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.AAAA)
				if !ok || record.AAAA == nil {
					return StringRecord{}, false
				}
				return StringRecord{Value: record.AAAA.String(), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "cname") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.CNAME = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeCNAME, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.CNAME)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: trimDNSDot(strings.TrimSpace(record.Target)), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "ns") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.NS = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeNS, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.NS)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: trimDNSDot(strings.TrimSpace(record.Ns)), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "mx") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.MX = lookupMXValues(ctx, cfg.Timeout, resolver, target)
		}()
	}

	if shouldQuery(recordType, "txt") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.TXT = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeTXT, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.TXT)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: strings.TrimSpace(strings.Join(record.Txt, "")), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "dmarc") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.DMARC = lookupStringValues(ctx, cfg.Timeout, resolver, "_dmarc."+target, dns.TypeTXT, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.TXT)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: strings.TrimSpace(strings.Join(record.Txt, "")), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "soa") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.SOA = lookupSOAValue(ctx, cfg.Timeout, resolver, target)
		}()
	}

	if shouldQuery(recordType, "srv") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.SRV = lookupSRVValues(ctx, cfg.Timeout, resolver, target)
		}()
	}

	if shouldQuery(recordType, "caa") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.CAA = lookupCAAValues(ctx, cfg.Timeout, resolver, target)
		}()
	}

	if shouldQuery(recordType, "dnskey") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.DNSKEY = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeDNSKEY, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.DNSKEY)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: fmt.Sprintf("flags=%d alg=%d keytag=%d", record.Flags, record.Algorithm, record.KeyTag()), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "ds") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.DS = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeDS, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.DS)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: fmt.Sprintf("keytag=%d alg=%d digest=%d", record.KeyTag, record.Algorithm, record.DigestType), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	if shouldQuery(recordType, "rrsig") {
		wg.Add(1)
		go func() {
			defer wg.Done()
			report.RRSIG = lookupStringValues(ctx, cfg.Timeout, resolver, target, dns.TypeRRSIG, func(rr dns.RR) (StringRecord, bool) {
				record, ok := rr.(*dns.RRSIG)
				if !ok {
					return StringRecord{}, false
				}
				return StringRecord{Value: fmt.Sprintf("covers=%s alg=%d keytag=%d", dns.TypeToString[record.TypeCovered], record.Algorithm, record.KeyTag), TTL: record.Hdr.Ttl}, true
			})
		}()
	}

	wg.Wait()

	if recordType == "all" || recordType == "ptr" {
		addresses := normalizeStrings(append(stringRecordValues(report.A.Records), stringRecordValues(report.AAAA.Records)...))
		if len(addresses) > 0 {
			report.PTR = make([]ReverseRecord, len(addresses))
			var ptrWG sync.WaitGroup
			ptrWG.Add(len(addresses))
			for i, addr := range addresses {
				go func(index int, ip string) {
					defer ptrWG.Done()
					report.PTR[index] = lookupReverse(ctx, ip, cfg.Timeout, resolver)
				}(i, addr)
			}
			ptrWG.Wait()
		}
	}

	report.Analysis = buildAnalysis(report)
	report.Summary = buildSummary(report, time.Since(started))
	if report.Summary.TotalRecords == 0 {
		if firstErr := firstSectionError(report); firstErr != "" {
			return report, fmt.Errorf("dns lookup failed: %s", firstErr)
		}
	}
	return report, nil
}

func shouldQuery(selected, want string) bool {
	return selected == "all" || selected == want
}

func lookupStringValues(ctx context.Context, timeout time.Duration, resolver, target string, qtype uint16, parser func(dns.RR) (StringRecord, bool)) StringSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, target, qtype, resolver, timeout)
	section := StringSection{
		DurationMs:    durationMS(time.Since(started)),
		Resolver:      result.Resolver,
		Authoritative: result.Authoritative,
	}
	if err != nil {
		section.Error = err.Error()
		return section
	}

	items := make([]StringRecord, 0, len(result.Answer))
	for _, answer := range result.Answer {
		if item, ok := parser(answer); ok {
			items = append(items, item)
		}
	}
	section.Records = normalizeStringRecords(items)
	section.Values = stringRecordValues(section.Records)
	return section
}

func lookupMXValues(ctx context.Context, timeout time.Duration, resolver, target string) MXSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, target, dns.TypeMX, resolver, timeout)
	section := MXSection{
		DurationMs:    durationMS(time.Since(started)),
		Resolver:      result.Resolver,
		Authoritative: result.Authoritative,
	}
	if err != nil {
		section.Error = err.Error()
		return section
	}

	for _, answer := range result.Answer {
		record, ok := answer.(*dns.MX)
		if !ok {
			continue
		}
		section.Records = append(section.Records, MXRecord{
			Host: trimDNSDot(strings.TrimSpace(record.Mx)),
			Pref: record.Preference,
			TTL:  record.Hdr.Ttl,
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Pref == section.Records[j].Pref {
			if section.Records[i].Host == section.Records[j].Host {
				return section.Records[i].TTL < section.Records[j].TTL
			}
			return section.Records[i].Host < section.Records[j].Host
		}
		return section.Records[i].Pref < section.Records[j].Pref
	})
	section.Records = uniqueMXRecords(section.Records)
	return section
}

func lookupSOAValue(ctx context.Context, timeout time.Duration, resolver, target string) SOASection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, target, dns.TypeSOA, resolver, timeout)
	section := SOASection{
		DurationMs:    durationMS(time.Since(started)),
		Resolver:      result.Resolver,
		Authoritative: result.Authoritative,
	}
	if err != nil {
		section.Error = err.Error()
		return section
	}

	for _, answer := range result.Answer {
		record, ok := answer.(*dns.SOA)
		if !ok {
			continue
		}
		section.Record = &SOARecord{
			NS:      trimDNSDot(strings.TrimSpace(record.Ns)),
			MBox:    trimDNSDot(strings.TrimSpace(record.Mbox)),
			Serial:  record.Serial,
			Refresh: record.Refresh,
			Retry:   record.Retry,
			Expire:  record.Expire,
			MinTTL:  record.Minttl,
			TTL:     record.Hdr.Ttl,
		}
		break
	}
	return section
}

func lookupSRVValues(ctx context.Context, timeout time.Duration, resolver, target string) SRVSection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, target, dns.TypeSRV, resolver, timeout)
	section := SRVSection{
		DurationMs:    durationMS(time.Since(started)),
		Resolver:      result.Resolver,
		Authoritative: result.Authoritative,
	}
	if err != nil {
		section.Error = err.Error()
		return section
	}

	for _, answer := range result.Answer {
		record, ok := answer.(*dns.SRV)
		if !ok {
			continue
		}
		section.Records = append(section.Records, SRVRecord{
			Target:   trimDNSDot(strings.TrimSpace(record.Target)),
			Port:     record.Port,
			Priority: record.Priority,
			Weight:   record.Weight,
			TTL:      record.Hdr.Ttl,
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Priority == section.Records[j].Priority {
			if section.Records[i].Weight == section.Records[j].Weight {
				if section.Records[i].Port == section.Records[j].Port {
					if section.Records[i].Target == section.Records[j].Target {
						return section.Records[i].TTL < section.Records[j].TTL
					}
					return section.Records[i].Target < section.Records[j].Target
				}
				return section.Records[i].Port < section.Records[j].Port
			}
			return section.Records[i].Weight < section.Records[j].Weight
		}
		return section.Records[i].Priority < section.Records[j].Priority
	})
	section.Records = uniqueSRVRecords(section.Records)
	return section
}

func lookupCAAValues(ctx context.Context, timeout time.Duration, resolver, target string) CAASection {
	started := time.Now()
	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, target, dns.TypeCAA, resolver, timeout)
	section := CAASection{
		DurationMs:    durationMS(time.Since(started)),
		Resolver:      result.Resolver,
		Authoritative: result.Authoritative,
	}
	if err != nil {
		section.Error = err.Error()
		return section
	}

	for _, answer := range result.Answer {
		record, ok := answer.(*dns.CAA)
		if !ok {
			continue
		}
		section.Records = append(section.Records, CAARecord{
			Flag:  record.Flag,
			Tag:   strings.TrimSpace(record.Tag),
			Value: strings.TrimSpace(record.Value),
			TTL:   record.Hdr.Ttl,
		})
	}
	sort.Slice(section.Records, func(i, j int) bool {
		if section.Records[i].Tag == section.Records[j].Tag {
			if section.Records[i].Value == section.Records[j].Value {
				if section.Records[i].Flag == section.Records[j].Flag {
					return section.Records[i].TTL < section.Records[j].TTL
				}
				return section.Records[i].Flag < section.Records[j].Flag
			}
			return section.Records[i].Value < section.Records[j].Value
		}
		return section.Records[i].Tag < section.Records[j].Tag
	})
	section.Records = uniqueCAARecords(section.Records)
	return section
}

func lookupReverse(ctx context.Context, addr string, timeout time.Duration, resolver string) ReverseRecord {
	started := time.Now()
	record := ReverseRecord{Address: addr}

	reverseName, err := dns.ReverseAddr(addr)
	record.DurationMs = durationMS(time.Since(started))
	if err != nil {
		record.Error = err.Error()
		return record
	}

	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	result, err := lookupRRs(callCtx, reverseName, dns.TypePTR, resolver, timeout)
	record.DurationMs = durationMS(time.Since(started))
	record.Resolver = result.Resolver
	record.Authoritative = result.Authoritative
	if err != nil {
		record.Error = err.Error()
		return record
	}

	items := make([]StringRecord, 0, len(result.Answer))
	for _, answer := range result.Answer {
		ptr, ok := answer.(*dns.PTR)
		if !ok {
			continue
		}
		items = append(items, StringRecord{Value: trimDNSDot(strings.TrimSpace(ptr.Ptr)), TTL: ptr.Hdr.Ttl})
	}
	record.Records = normalizeStringRecords(items)
	record.Names = stringRecordValues(record.Records)
	return record
}

func lookupDNSRecords(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
	client := &dns.Client{Timeout: timeout}
	msg := &dns.Msg{}
	msg.SetQuestion(dns.Fqdn(strings.TrimSpace(name)), qtype)

	var lastErr error
	for _, server := range dnsServers(resolver) {
		response, _, err := client.ExchangeContext(ctx, msg, server)
		if err != nil {
			if ctx.Err() != nil {
				return rrLookupResult{}, ctx.Err()
			}
			lastErr = err
			continue
		}
		if response == nil {
			lastErr = fmt.Errorf("dns query failed: empty resolver response")
			continue
		}
		if response.Rcode != dns.RcodeSuccess {
			lastErr = fmt.Errorf("dns query failed: %s", dns.RcodeToString[response.Rcode])
			continue
		}
		return rrLookupResult{
			Answer:        response.Answer,
			Resolver:      server,
			Authoritative: response.Authoritative,
		}, nil
	}
	if lastErr != nil {
		return rrLookupResult{}, lastErr
	}
	return rrLookupResult{}, fmt.Errorf("dns query failed: no resolver response")
}

func dnsServers(resolver string) []string {
	if strings.TrimSpace(resolver) != "" {
		return []string{resolver}
	}
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
			port := strings.TrimSpace(cfg.Port)
			if port == "" {
				port = "53"
			}
			servers = append(servers, net.JoinHostPort(server, port))
		}
		if len(servers) > 0 {
			return servers
		}
	}
	return []string{"1.1.1.1:53", "8.8.8.8:53", "9.9.9.9:53"}
}

func normalizeRecordType(value string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "all":
		return "all", nil
	case "a", "aaaa", "cname", "ns", "mx", "txt", "soa", "srv", "caa", "ptr", "dmarc", "dnskey", "ds", "rrsig":
		return strings.ToLower(strings.TrimSpace(value)), nil
	default:
		return "", fmt.Errorf("unsupported record type")
	}
}

func normalizeResolver(value string) (string, error) {
	value = strings.TrimSpace(strings.ToLower(value))
	switch value {
	case "", "auto", "default", "system":
		return "", nil
	case "cloudflare":
		return "1.1.1.1:53", nil
	case "google":
		return "8.8.8.8:53", nil
	case "quad9":
		return "9.9.9.9:53", nil
	}

	if value == "" {
		return "", nil
	}
	if _, _, err := net.SplitHostPort(value); err == nil {
		return value, nil
	}
	if strings.Count(value, ":") > 1 && !strings.HasPrefix(value, "[") {
		return net.JoinHostPort(value, "53"), nil
	}
	return net.JoinHostPort(value, "53"), nil
}

func displayRecordType(value string) string {
	if value == "" || value == "all" {
		return "ALL"
	}
	return strings.ToUpper(value)
}

func displayResolver(value string) string {
	if strings.TrimSpace(value) == "" {
		return "auto"
	}
	return value
}

func normalizeStringRecords(records []StringRecord) []StringRecord {
	if len(records) == 0 {
		return nil
	}
	filtered := make([]StringRecord, 0, len(records))
	seen := make(map[string]struct{}, len(records))
	for _, record := range records {
		record.Value = trimDNSDot(strings.TrimSpace(record.Value))
		if record.Value == "" {
			continue
		}
		key := fmt.Sprintf("%s|%d", record.Value, record.TTL)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		filtered = append(filtered, record)
	}
	sort.Slice(filtered, func(i, j int) bool {
		if filtered[i].Value == filtered[j].Value {
			return filtered[i].TTL < filtered[j].TTL
		}
		return filtered[i].Value < filtered[j].Value
	})
	return filtered
}

func stringRecordValues(records []StringRecord) []string {
	if len(records) == 0 {
		return nil
	}
	values := make([]string, 0, len(records))
	seen := make(map[string]struct{}, len(records))
	for _, record := range records {
		if _, ok := seen[record.Value]; ok {
			continue
		}
		seen[record.Value] = struct{}{}
		values = append(values, record.Value)
	}
	return values
}

func uniqueMXRecords(records []MXRecord) []MXRecord {
	if len(records) == 0 {
		return nil
	}
	filtered := make([]MXRecord, 0, len(records))
	seen := make(map[string]struct{}, len(records))
	for _, record := range records {
		key := fmt.Sprintf("%s|%d|%d", record.Host, record.Pref, record.TTL)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		filtered = append(filtered, record)
	}
	return filtered
}

func uniqueSRVRecords(records []SRVRecord) []SRVRecord {
	if len(records) == 0 {
		return nil
	}
	filtered := make([]SRVRecord, 0, len(records))
	seen := make(map[string]struct{}, len(records))
	for _, record := range records {
		key := fmt.Sprintf("%s|%d|%d|%d|%d", record.Target, record.Port, record.Priority, record.Weight, record.TTL)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		filtered = append(filtered, record)
	}
	return filtered
}

func uniqueCAARecords(records []CAARecord) []CAARecord {
	if len(records) == 0 {
		return nil
	}
	filtered := make([]CAARecord, 0, len(records))
	seen := make(map[string]struct{}, len(records))
	for _, record := range records {
		key := fmt.Sprintf("%d|%s|%s|%d", record.Flag, record.Tag, record.Value, record.TTL)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		filtered = append(filtered, record)
	}
	return filtered
}

func trimDNSDot(value string) string {
	return strings.TrimSuffix(value, ".")
}

func durationMS(d time.Duration) float64 {
	return float64(d) / float64(time.Millisecond)
}

func buildAnalysis(report Report) Analysis {
	spfPresent := false
	for _, record := range report.TXT.Records {
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(record.Value)), "v=spf1") {
			spfPresent = true
			break
		}
	}

	dmarcPresent := false
	for _, record := range report.DMARC.Records {
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(record.Value)), "v=dmarc1") {
			dmarcPresent = true
			break
		}
	}

	mxPresent := len(report.MX.Records) > 0
	caaPresent := len(report.CAA.Records) > 0
	dnskeyPresent := len(report.DNSKEY.Records) > 0
	dsPresent := len(report.DS.Records) > 0
	rrsigPresent := len(report.RRSIG.Records) > 0

	return Analysis{
		SPFPresent:    spfPresent,
		DMARCPresent:  dmarcPresent,
		MXPresent:     mxPresent,
		CAAPresent:    caaPresent,
		DNSKEYPresent: dnskeyPresent,
		DSPresent:     dsPresent,
		RRSIGPresent:  rrsigPresent,
		DNSSECPresent: dnskeyPresent || dsPresent || rrsigPresent,
		MailReady:     mxPresent && spfPresent && dmarcPresent,
	}
}

func buildSummary(report Report, duration time.Duration) Summary {
	addresses := normalizeStrings(append(stringRecordValues(report.A.Records), stringRecordValues(report.AAAA.Records)...))
	totalRecords := len(report.A.Records) + len(report.AAAA.Records) + len(report.CNAME.Records) + len(report.NS.Records) + len(report.TXT.Records) + len(report.DMARC.Records) + len(report.MX.Records) + len(report.SRV.Records) + len(report.CAA.Records) + len(report.DNSKEY.Records) + len(report.DS.Records) + len(report.RRSIG.Records)
	if report.SOA.Record != nil {
		totalRecords++
	}
	reverseLookups := 0
	for _, ptr := range report.PTR {
		reverseLookups += len(ptr.Records)
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
	for _, errText := range []string{report.A.Error, report.AAAA.Error, report.CNAME.Error, report.NS.Error, report.MX.Error, report.TXT.Error, report.DMARC.Error, report.SOA.Error, report.SRV.Error, report.CAA.Error, report.DNSKEY.Error, report.DS.Error, report.RRSIG.Error} {
		if strings.TrimSpace(errText) != "" {
			return errText
		}
	}
	for _, ptr := range report.PTR {
		if strings.TrimSpace(ptr.Error) != "" {
			return ptr.Error
		}
	}
	return ""
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
