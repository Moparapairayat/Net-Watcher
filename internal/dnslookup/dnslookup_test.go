package dnslookup

import (
	"context"
	"errors"
	"net"
	"reflect"
	"testing"
	"time"

	"github.com/miekg/dns"
)

func TestRunContextHost(t *testing.T) {
	origIPv4 := lookupIPv4
	origIPv6 := lookupIPv6
	origCNAME := lookupCNAME
	origNS := lookupNS
	origMX := lookupMX
	origTXT := lookupTXT
	origAddr := lookupAddr
	origRRs := lookupRRs
	defer func() {
		lookupIPv4 = origIPv4
		lookupIPv6 = origIPv6
		lookupCNAME = origCNAME
		lookupNS = origNS
		lookupMX = origMX
		lookupTXT = origTXT
		lookupAddr = origAddr
		lookupRRs = origRRs
	}()

	lookupIPv4 = func(ctx context.Context, host string) ([]net.IP, error) {
		return []net.IP{net.ParseIP("93.184.216.34")}, nil
	}
	lookupIPv6 = func(ctx context.Context, host string) ([]net.IP, error) {
		return []net.IP{net.ParseIP("2606:2800:220:1:248:1893:25c8:1946")}, nil
	}
	lookupCNAME = func(ctx context.Context, host string) (string, error) {
		return "edge.example.test.", nil
	}
	lookupNS = func(ctx context.Context, host string) ([]*net.NS, error) {
		return []*net.NS{{Host: "ns1.example.test."}, {Host: "ns2.example.test."}}, nil
	}
	lookupMX = func(ctx context.Context, host string) ([]*net.MX, error) {
		return []*net.MX{{Host: "mail.example.test.", Pref: 10}}, nil
	}
	lookupTXT = func(ctx context.Context, host string) ([]string, error) {
		return []string{"v=spf1 include:mail.example.test ~all"}, nil
	}
	lookupAddr = func(ctx context.Context, addr string) ([]string, error) {
		return []string{"ptr." + addr + ".example.test."}, nil
	}
	lookupRRs = func(ctx context.Context, name string, qtype uint16) ([]dns.RR, error) {
		switch qtype {
		case dns.TypeSOA:
			return []dns.RR{&dns.SOA{Ns: "ns1.example.test.", Mbox: "hostmaster.example.test.", Serial: 2026032401, Refresh: 3600, Retry: 600, Expire: 1209600, Minttl: 300}}, nil
		case dns.TypeSRV:
			return []dns.RR{
				&dns.SRV{Priority: 10, Weight: 5, Port: 443, Target: "svc-a.example.test."},
				&dns.SRV{Priority: 20, Weight: 5, Port: 8443, Target: "svc-b.example.test."},
			}, nil
		case dns.TypeCAA:
			return []dns.RR{
				&dns.CAA{Flag: 0, Tag: "issue", Value: "letsencrypt.org"},
				&dns.CAA{Flag: 0, Tag: "iodef", Value: "mailto:security.example.test"},
			}, nil
		default:
			return nil, nil
		}
	}

	rep, err := RunContext(context.Background(), "example.test", Config{Timeout: time.Second})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}
	if rep.Protocol != "dns" {
		t.Fatalf("expected protocol dns, got %q", rep.Protocol)
	}
	if rep.Kind != "host" {
		t.Fatalf("expected kind host, got %q", rep.Kind)
	}
	if !reflect.DeepEqual(rep.A.Values, []string{"93.184.216.34"}) {
		t.Fatalf("unexpected A values: %#v", rep.A.Values)
	}
	if !reflect.DeepEqual(rep.AAAA.Values, []string{"2606:2800:220:1:248:1893:25c8:1946"}) {
		t.Fatalf("unexpected AAAA values: %#v", rep.AAAA.Values)
	}
	if !reflect.DeepEqual(rep.CNAME.Values, []string{"edge.example.test"}) {
		t.Fatalf("unexpected CNAME values: %#v", rep.CNAME.Values)
	}
	if len(rep.PTR) != 2 {
		t.Fatalf("expected 2 PTR lookups, got %d", len(rep.PTR))
	}
	if rep.SOA.Record == nil || rep.SOA.Record.NS != "ns1.example.test" {
		t.Fatalf("unexpected SOA record: %#v", rep.SOA.Record)
	}
	if len(rep.SRV.Records) != 2 {
		t.Fatalf("unexpected SRV records: %#v", rep.SRV.Records)
	}
	if len(rep.CAA.Records) != 2 {
		t.Fatalf("unexpected CAA records: %#v", rep.CAA.Records)
	}
	if rep.Summary.TotalRecords < 12 {
		t.Fatalf("expected summary records to be populated, got %+v", rep.Summary)
	}
}

func TestRunContextIP(t *testing.T) {
	origAddr := lookupAddr
	defer func() { lookupAddr = origAddr }()

	lookupAddr = func(ctx context.Context, addr string) ([]string, error) {
		if addr != "8.8.8.8" {
			t.Fatalf("unexpected reverse lookup addr %q", addr)
		}
		return []string{"dns.google."}, nil
	}

	rep, err := RunContext(context.Background(), "8.8.8.8", Config{Timeout: time.Second})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}
	if rep.Kind != "ip" {
		t.Fatalf("expected kind ip, got %q", rep.Kind)
	}
	if len(rep.PTR) != 1 || !reflect.DeepEqual(rep.PTR[0].Names, []string{"dns.google"}) {
		t.Fatalf("unexpected PTR results: %#v", rep.PTR)
	}
}

func TestRunContextHostFailure(t *testing.T) {
	origIPv4 := lookupIPv4
	origIPv6 := lookupIPv6
	origCNAME := lookupCNAME
	origNS := lookupNS
	origMX := lookupMX
	origTXT := lookupTXT
	origRRs := lookupRRs
	defer func() {
		lookupIPv4 = origIPv4
		lookupIPv6 = origIPv6
		lookupCNAME = origCNAME
		lookupNS = origNS
		lookupMX = origMX
		lookupTXT = origTXT
		lookupRRs = origRRs
	}()

	fail := errors.New("lookup no such host")
	lookupIPv4 = func(ctx context.Context, host string) ([]net.IP, error) { return nil, fail }
	lookupIPv6 = func(ctx context.Context, host string) ([]net.IP, error) { return nil, fail }
	lookupCNAME = func(ctx context.Context, host string) (string, error) { return "", fail }
	lookupNS = func(ctx context.Context, host string) ([]*net.NS, error) { return nil, fail }
	lookupMX = func(ctx context.Context, host string) ([]*net.MX, error) { return nil, fail }
	lookupTXT = func(ctx context.Context, host string) ([]string, error) { return nil, fail }
	lookupRRs = func(ctx context.Context, name string, qtype uint16) ([]dns.RR, error) { return nil, fail }

	rep, err := RunContext(context.Background(), "missing.test", Config{Timeout: time.Second})
	if err == nil {
		t.Fatal("expected error for missing host")
	}
	if rep.Target != "missing.test" {
		t.Fatalf("unexpected report target %q", rep.Target)
	}
	if rep.A.Error == "" || rep.AAAA.Error == "" {
		t.Fatalf("expected section errors in report: %+v", rep)
	}
}
