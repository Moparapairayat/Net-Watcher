package portscan

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"
)

func TestParsePortsSupportsRangesAndDedup(t *testing.T) {
	ports, err := ParsePorts("443, 80, 443, 8000-8002")
	if err != nil {
		t.Fatalf("ParsePorts returned error: %v", err)
	}

	expected := []int{80, 443, 8000, 8001, 8002}
	if len(ports) != len(expected) {
		t.Fatalf("expected %d ports, got %d", len(expected), len(ports))
	}
	for i, port := range expected {
		if ports[i] != port {
			t.Fatalf("expected port %d at index %d, got %d", port, i, ports[i])
		}
	}
}

func TestRunContextDetectsOpenPort(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	port := ln.Addr().(*net.TCPAddr).Port
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rep, err := RunContext(ctx, "127.0.0.1", Config{
		Ports:       []int{port},
		Timeout:     500 * time.Millisecond,
		Concurrency: 1,
	})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}

	if rep.Protocol != "tcp-portscan" {
		t.Fatalf("expected protocol tcp-portscan, got %q", rep.Protocol)
	}
	if rep.Summary.Scanned != 1 || rep.Summary.Open != 1 {
		t.Fatalf("unexpected summary: %#v", rep.Summary)
	}
	if len(rep.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(rep.Results))
	}
	if rep.Results[0].Port != port || rep.Results[0].State != "open" {
		t.Fatalf("unexpected result: %#v", rep.Results[0])
	}

	_ = ln.Close()
	<-done
}

func TestRunContextScansAcrossResolvedAddresses(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	previousLookup := lookupIPAddrs
	lookupIPAddrs = func(ctx context.Context, host string) ([]net.IPAddr, error) {
		return []net.IPAddr{
			{IP: net.ParseIP("127.0.0.2")},
			{IP: net.ParseIP("127.0.0.1")},
		}, nil
	}
	defer func() {
		lookupIPAddrs = previousLookup
	}()

	port := ln.Addr().(*net.TCPAddr).Port
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rep, err := RunContext(ctx, "example.test", Config{
		Ports:       []int{port},
		Timeout:     500 * time.Millisecond,
		Concurrency: 1,
	})
	if err != nil {
		t.Fatalf("RunContext returned error: %v", err)
	}

	if rep.Summary.Open != 1 {
		t.Fatalf("expected open port through fallback address, got %#v", rep.Summary)
	}
	if len(rep.Results) != 1 || rep.Results[0].State != "open" {
		t.Fatalf("unexpected result: %#v", rep.Results)
	}

	_ = ln.Close()
	<-done
}

func TestClassifyErrorNormalizesConnectexRefused(t *testing.T) {
	state, message := classifyError(errors.New("dial tcp 127.0.0.1:1: connectex: No connection could be made because the target machine actively refused it."))
	if state != "closed" {
		t.Fatalf("expected closed state, got %q", state)
	}
	if message != "connection refused" {
		t.Fatalf("expected normalized message, got %q", message)
	}
}
