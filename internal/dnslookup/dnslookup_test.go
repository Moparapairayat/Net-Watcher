package dnslookup

import (
	"context"
	"errors"
	"reflect"
	"sort"
	"testing"
	"time"

	"github.com/miekg/dns"
)

func TestRunContextHost(t *testing.T) {
	origLookupRRs := lookupRRs
	defer func() { lookupRRs = origLookupRRs }()

	lookupRRs = func(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
		result := rrLookupResult{Resolver: "1.1.1.1:53", Authoritative: true}
		switch qtype {
		case dns.TypeA:
			result.Answer = []dns.RR{&dns.A{Hdr: dns.RR_Header{Ttl: 120}, A: []byte{93, 184, 216, 34}}}
		case dns.TypeAAAA:
			result.Answer = []dns.RR{&dns.AAAA{Hdr: dns.RR_Header{Ttl: 180}, AAAA: []byte{0x26, 0x06, 0x28, 0x00, 0x02, 0x20, 0x00, 0x01, 0x02, 0x48, 0x18, 0x93, 0x25, 0xc8, 0x19, 0x46}}}
		case dns.TypeCNAME:
			result.Answer = []dns.RR{&dns.CNAME{Hdr: dns.RR_Header{Ttl: 300}, Target: "edge.example.test."}}
		case dns.TypeNS:
			result.Answer = []dns.RR{
				&dns.NS{Hdr: dns.RR_Header{Ttl: 600}, Ns: "ns1.example.test."},
				&dns.NS{Hdr: dns.RR_Header{Ttl: 600}, Ns: "ns2.example.test."},
			}
		case dns.TypeMX:
			result.Answer = []dns.RR{&dns.MX{Hdr: dns.RR_Header{Ttl: 400}, Preference: 10, Mx: "mail.example.test."}}
		case dns.TypeTXT:
			if name == "_dmarc.example.test" {
				result.Answer = []dns.RR{&dns.TXT{Hdr: dns.RR_Header{Ttl: 300}, Txt: []string{"v=DMARC1; p=none"}}}
				break
			}
			result.Answer = []dns.RR{&dns.TXT{Hdr: dns.RR_Header{Ttl: 300}, Txt: []string{"v=spf1 include:mail.example.test ~all"}}}
		case dns.TypeSOA:
			result.Answer = []dns.RR{&dns.SOA{Hdr: dns.RR_Header{Ttl: 3600}, Ns: "ns1.example.test.", Mbox: "hostmaster.example.test.", Serial: 2026032401, Refresh: 3600, Retry: 600, Expire: 1209600, Minttl: 300}}
		case dns.TypeSRV:
			result.Answer = []dns.RR{
				&dns.SRV{Hdr: dns.RR_Header{Ttl: 120}, Priority: 10, Weight: 5, Port: 443, Target: "svc-a.example.test."},
				&dns.SRV{Hdr: dns.RR_Header{Ttl: 120}, Priority: 20, Weight: 5, Port: 8443, Target: "svc-b.example.test."},
			}
		case dns.TypeCAA:
			result.Answer = []dns.RR{
				&dns.CAA{Hdr: dns.RR_Header{Ttl: 300}, Flag: 0, Tag: "issue", Value: "letsencrypt.org"},
				&dns.CAA{Hdr: dns.RR_Header{Ttl: 300}, Flag: 0, Tag: "iodef", Value: "mailto:security.example.test"},
			}
		case dns.TypeDNSKEY:
			result.Answer = []dns.RR{&dns.DNSKEY{Hdr: dns.RR_Header{Ttl: 3600}, Flags: 257, Protocol: 3, Algorithm: 8, PublicKey: "AQPSKmynfzW4kyBv015MUG2DeIQ3Cbl+BBZH4b/0PY1kxkmvHjcZc8no"}}
		case dns.TypeDS:
			result.Answer = []dns.RR{&dns.DS{Hdr: dns.RR_Header{Ttl: 3600}, KeyTag: 60485, Algorithm: 8, DigestType: 2, Digest: "2BB183AF5F22588179A53B0A98631FAD1A292118"}}
		case dns.TypeRRSIG:
			result.Answer = []dns.RR{&dns.RRSIG{Hdr: dns.RR_Header{Ttl: 3600}, TypeCovered: dns.TypeDNSKEY, Algorithm: 8, Labels: 2, OrigTtl: 3600, Expiration: 1740000000, Inception: 1730000000, KeyTag: 60485, SignerName: "example.test.", Signature: "abc123"}}
		case dns.TypePTR:
			result.Answer = []dns.RR{&dns.PTR{Hdr: dns.RR_Header{Ttl: 200}, Ptr: "ptr.example.test."}}
		}
		return result, nil
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
	if rep.RecordType != "ALL" {
		t.Fatalf("expected record type ALL, got %q", rep.RecordType)
	}
	if rep.Resolver != "auto" {
		t.Fatalf("expected auto resolver display, got %q", rep.Resolver)
	}
	if !reflect.DeepEqual(rep.A.Values, []string{"93.184.216.34"}) {
		t.Fatalf("unexpected A values: %#v", rep.A.Values)
	}
	if len(rep.A.Records) != 1 || rep.A.Records[0].TTL != 120 {
		t.Fatalf("unexpected A records: %#v", rep.A.Records)
	}
	if !reflect.DeepEqual(rep.CNAME.Values, []string{"edge.example.test"}) {
		t.Fatalf("unexpected CNAME values: %#v", rep.CNAME.Values)
	}
	if len(rep.PTR) != 2 {
		t.Fatalf("expected 2 PTR lookups, got %d", len(rep.PTR))
	}
	if rep.SOA.Record == nil || rep.SOA.Record.NS != "ns1.example.test" || rep.SOA.Record.TTL != 3600 {
		t.Fatalf("unexpected SOA record: %#v", rep.SOA.Record)
	}
	if len(rep.SRV.Records) != 2 {
		t.Fatalf("unexpected SRV records: %#v", rep.SRV.Records)
	}
	if len(rep.CAA.Records) != 2 {
		t.Fatalf("unexpected CAA records: %#v", rep.CAA.Records)
	}
	if !rep.Analysis.MailReady || !rep.Analysis.DNSSECPresent {
		t.Fatalf("unexpected analysis: %#v", rep.Analysis)
	}
	if len(rep.DMARC.Records) != 1 || len(rep.DNSKEY.Records) != 1 || len(rep.DS.Records) != 1 || len(rep.RRSIG.Records) != 1 {
		t.Fatalf("expected policy and dnssec records to be populated: %#v %#v %#v %#v", rep.DMARC, rep.DNSKEY, rep.DS, rep.RRSIG)
	}
	if rep.Summary.TotalRecords < 16 {
		t.Fatalf("expected summary records to be populated, got %+v", rep.Summary)
	}
}

func TestRunContextIP(t *testing.T) {
	origLookupRRs := lookupRRs
	defer func() { lookupRRs = origLookupRRs }()

	lookupRRs = func(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
		if qtype != dns.TypePTR {
			t.Fatalf("unexpected query type %d", qtype)
		}
		return rrLookupResult{
			Resolver: "8.8.8.8:53",
			Answer:   []dns.RR{&dns.PTR{Hdr: dns.RR_Header{Ttl: 120}, Ptr: "dns.google."}},
		}, nil
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
	if rep.PTR[0].Resolver != "8.8.8.8:53" {
		t.Fatalf("unexpected PTR resolver: %#v", rep.PTR[0])
	}
}

func TestRunContextHostFailure(t *testing.T) {
	origLookupRRs := lookupRRs
	defer func() { lookupRRs = origLookupRRs }()

	fail := errors.New("lookup no such host")
	lookupRRs = func(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
		return rrLookupResult{}, fail
	}

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

func TestRunContextSingleRecordTypeAndResolver(t *testing.T) {
	origLookupRRs := lookupRRs
	defer func() { lookupRRs = origLookupRRs }()

	var seen []uint16
	lookupRRs = func(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
		seen = append(seen, qtype)
		if resolver != "8.8.8.8:53" {
			t.Fatalf("unexpected resolver %q", resolver)
		}
		if qtype != dns.TypeMX {
			return rrLookupResult{}, nil
		}
		return rrLookupResult{
			Resolver: "8.8.8.8:53",
			Answer:   []dns.RR{&dns.MX{Hdr: dns.RR_Header{Ttl: 300}, Preference: 5, Mx: "mail.example.test."}},
		}, nil
	}

	rep, err := RunContext(context.Background(), "example.test", Config{Timeout: time.Second, RecordType: "mx", Resolver: "google"})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}
	if rep.RecordType != "MX" {
		t.Fatalf("unexpected record type %q", rep.RecordType)
	}
	if rep.Resolver != "8.8.8.8:53" {
		t.Fatalf("unexpected report resolver %q", rep.Resolver)
	}
	if len(rep.MX.Records) != 1 || rep.MX.Records[0].TTL != 300 {
		t.Fatalf("unexpected MX records: %#v", rep.MX.Records)
	}
	sort.Slice(seen, func(i, j int) bool { return seen[i] < seen[j] })
	if !reflect.DeepEqual(seen, []uint16{dns.TypeMX}) {
		t.Fatalf("unexpected query sequence: %#v", seen)
	}
}

func TestRunContextDMARCOnly(t *testing.T) {
	origLookupRRs := lookupRRs
	defer func() { lookupRRs = origLookupRRs }()

	lookupRRs = func(ctx context.Context, name string, qtype uint16, resolver string, timeout time.Duration) (rrLookupResult, error) {
		if resolver != "1.1.1.1:53" {
			t.Fatalf("unexpected resolver %q", resolver)
		}
		if qtype != dns.TypeTXT {
			t.Fatalf("unexpected query type %d", qtype)
		}
		if name != "_dmarc.example.test" {
			t.Fatalf("unexpected query name %q", name)
		}
		return rrLookupResult{
			Resolver:      "1.1.1.1:53",
			Authoritative: true,
			Answer:        []dns.RR{&dns.TXT{Hdr: dns.RR_Header{Ttl: 600}, Txt: []string{"v=DMARC1; p=quarantine"}}},
		}, nil
	}

	rep, err := RunContext(context.Background(), "example.test", Config{Timeout: time.Second, RecordType: "dmarc", Resolver: "cloudflare"})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}
	if rep.RecordType != "DMARC" {
		t.Fatalf("unexpected record type %q", rep.RecordType)
	}
	if len(rep.DMARC.Records) != 1 || rep.DMARC.Records[0].TTL != 600 {
		t.Fatalf("unexpected DMARC records: %#v", rep.DMARC.Records)
	}
	if !rep.Analysis.DMARCPresent || rep.Analysis.MailReady {
		t.Fatalf("unexpected analysis for DMARC-only lookup: %#v", rep.Analysis)
	}
}
