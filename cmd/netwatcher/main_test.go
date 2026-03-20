package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"netwatcher/internal/store"
)

func TestNormalizePingConfigDefaultsAndBounds(t *testing.T) {
	cfg, err := normalizePingConfig(0, 0, 0, 0, true)
	if err != nil {
		t.Fatalf("normalizePingConfig returned error: %v", err)
	}

	if cfg.Count != defaultProbeCount {
		t.Fatalf("expected default count %d, got %d", defaultProbeCount, cfg.Count)
	}
	if cfg.Interval != defaultProbeInterval {
		t.Fatalf("expected default interval %s, got %s", defaultProbeInterval, cfg.Interval)
	}
	if cfg.Timeout != defaultProbeTimeout {
		t.Fatalf("expected default timeout %s, got %s", defaultProbeTimeout, cfg.Timeout)
	}
	if cfg.Size != defaultPingSize {
		t.Fatalf("expected default size %d, got %d", defaultPingSize, cfg.Size)
	}
	if !cfg.ForceIPv6 {
		t.Fatal("expected ForceIPv6 to be preserved")
	}

	if _, err := normalizePingConfig(maxProbeCount+1, time.Second, time.Second, defaultPingSize, false); err == nil {
		t.Fatal("expected count validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, minProbeInterval-time.Millisecond, time.Second, defaultPingSize, false); err == nil {
		t.Fatal("expected interval validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, time.Second, minProbeTimeout-time.Millisecond, defaultPingSize, false); err == nil {
		t.Fatal("expected timeout validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, time.Second, time.Second, minPingSize-1, false); err == nil {
		t.Fatal("expected size validation error")
	}
}

func TestNormalizeTCPPingRequestDefaultsAndBounds(t *testing.T) {
	host, port, cfg, err := normalizeTCPPingRequest("  example.com  ", 0, 0, 0, 0)
	if err != nil {
		t.Fatalf("normalizeTCPPingRequest returned error: %v", err)
	}

	if host != "example.com" {
		t.Fatalf("expected trimmed host, got %q", host)
	}
	if port != defaultTCPPort {
		t.Fatalf("expected default port %d, got %d", defaultTCPPort, port)
	}
	if cfg.Count != defaultProbeCount {
		t.Fatalf("expected default count %d, got %d", defaultProbeCount, cfg.Count)
	}

	if _, _, _, err := normalizeTCPPingRequest("", 443, 1, time.Second, time.Second); err == nil {
		t.Fatal("expected host validation error")
	}
	if _, _, _, err := normalizeTCPPingRequest("example.com", 70000, 1, time.Second, time.Second); err == nil {
		t.Fatal("expected port validation error")
	}
}

func TestNormalizeArgsKeepsBoolFlagsFromConsumingHost(t *testing.T) {
	fs := newPingFlagSet()
	if err := fs.Parse(normalizeArgs(fs, []string{"--ipv6", "example.com"})); err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if fs.NArg() != 1 || fs.Arg(0) != "example.com" {
		t.Fatalf("expected host to remain positional, got %q", fs.Arg(0))
	}
}

func TestNormalizeArgsMovesValueFlagsAheadOfPositionals(t *testing.T) {
	fs := newTCPPingFlagSet()
	if err := fs.Parse(normalizeArgs(fs, []string{"example.com", "--port", "443"})); err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	portValue := fs.Lookup("port").Value.String()
	if portValue != "443" {
		t.Fatalf("expected port flag to parse as 443, got %s", portValue)
	}
	if fs.NArg() != 1 || fs.Arg(0) != "example.com" {
		t.Fatalf("expected host positional arg, got %q", fs.Arg(0))
	}
}

func TestHandlePingRejectsInvalidPayload(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com","count":101}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}

	var resp apiError
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !strings.Contains(resp.Error, "count must be") {
		t.Fatalf("unexpected error message: %q", resp.Error)
	}
}

func TestHandlePingRejectsForbiddenOrigin(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://evil.example")
	req.Host = "127.0.0.1:8080"
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}
}

func TestHandlePingRejectsOversizedBody(t *testing.T) {
	host := strings.Repeat("a", maxJSONBodyBytes)
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"`+host+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "request body too large") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandlePingRejectsTrailingJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}{"extra":true}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "single JSON object") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandleHistoryReturnsStoredPoints(t *testing.T) {
	st := openTestStore(t)
	oldStore := appStore
	appStore = st
	t.Cleanup(func() {
		appStore = oldStore
	})

	now := time.Now()
	st.InsertAsync(store.ResultRecord{
		Ts:       now,
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(12.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory("ping", "example.com", 0, 10)
		return err == nil && len(points) == 1
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=ping&host=example.com&limit=10", nil)
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var points []store.HistoryPoint
	if err := json.Unmarshal(rr.Body.Bytes(), &points); err != nil {
		t.Fatalf("failed to decode points: %v", err)
	}
	if len(points) != 1 {
		t.Fatalf("expected 1 point, got %d", len(points))
	}
	if points[0].Seq != 1 {
		t.Fatalf("expected seq 1, got %d", points[0].Seq)
	}
}

func TestHandleHistoryNormalizesTCPHostPort(t *testing.T) {
	st := openTestStore(t)
	oldStore := appStore
	appStore = st
	t.Cleanup(func() {
		appStore = oldStore
	})

	now := time.Now()
	st.InsertAsync(store.ResultRecord{
		Ts:       now,
		Protocol: "tcpping",
		Target:   "example.com",
		Port:     443,
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(12.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory("tcpping", "example.com", 443, 10)
		return err == nil && len(points) == 1
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=tcpping&host=example.com:443&limit=10", nil)
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var points []store.HistoryPoint
	if err := json.Unmarshal(rr.Body.Bytes(), &points); err != nil {
		t.Fatalf("failed to decode points: %v", err)
	}
	if len(points) != 1 {
		t.Fatalf("expected 1 point, got %d", len(points))
	}
}

func TestHandleHistoryRejectsInvalidLimit(t *testing.T) {
	st := openTestStore(t)
	oldStore := appStore
	appStore = st
	t.Cleanup(func() {
		appStore = oldStore
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=ping&host=example.com&limit=5000", nil)
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "limit must be") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHistoryCSVRowsIncludesHeader(t *testing.T) {
	rows := historyCSVRows([]store.HistoryPoint{{Ts: 123, Seq: 1, RttMs: float64Ptr(1.25)}})
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if got := strings.Join(rows[0], ","); got != "timestamp_ms,sequence,rtt_ms,error" {
		t.Fatalf("unexpected header row: %q", got)
	}
}

func TestHandleTCPPingStoresPerProbeTimestamps(t *testing.T) {
	st := openTestStore(t)
	oldStore := appStore
	appStore = st
	t.Cleanup(func() {
		appStore = oldStore
	})

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
	body := fmt.Sprintf(`{"host":"127.0.0.1","port":%d,"count":2,"interval_ms":120,"timeout_ms":500}`, port)
	req := httptest.NewRequest(http.MethodPost, "/api/tcpping", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handleTCPPing(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var points []store.HistoryPoint
	waitFor(t, 2*time.Second, func() bool {
		var err error
		points, err = st.QueryHistory("tcpping", "127.0.0.1", port, 10)
		return err == nil && len(points) == 2
	})

	if points[0].Ts == points[1].Ts {
		t.Fatalf("expected distinct timestamps, got %d and %d", points[0].Ts, points[1].Ts)
	}

	_ = ln.Close()
	<-done
}

func TestIsAllowedWSOriginAcceptsSameHostAndRejectsDifferentHost(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080/ws", nil)
	req.Host = "127.0.0.1:8080"

	if !isAllowedWSOrigin(req, "http://127.0.0.1:8080") {
		t.Fatal("expected same host origin to be allowed")
	}
	if isAllowedWSOrigin(req, "http://example.com:8080") {
		t.Fatal("expected different host origin to be rejected")
	}
}

func TestHandleWSRejectsInvalidPingRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(wsRequest{Type: "ping", Host: "example.com", Count: maxProbeCount + 1}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if evt.Type != "error" {
		t.Fatalf("expected error event, got %q", evt.Type)
	}
	if !strings.Contains(evt.Error, "count must be") {
		t.Fatalf("unexpected websocket error: %q", evt.Error)
	}
}

func TestHandleWSRejectsWhenProbeLimiterFull(t *testing.T) {
	fillProbeLimiter()
	defer drainProbeLimiter()

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(wsRequest{Type: "ping", Host: "example.com", Count: 1}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if evt.Type != "error" || !strings.Contains(evt.Error, "server busy") {
		t.Fatalf("unexpected websocket event: %#v", evt)
	}
}

func TestHandleWSStopCancelsActiveRun(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	acceptDone := make(chan struct{})
	go func() {
		defer close(acceptDone)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	if err := conn.WriteJSON(wsRequest{Type: "tcpping", Host: "127.0.0.1", Port: port, Count: 50, IntervalMs: 5000, TimeoutMs: 200}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read first event failed: %v", err)
	}
	if evt.Type != "result" {
		t.Fatalf("expected first event to be result, got %#v", evt)
	}

	if err := conn.WriteJSON(wsRequest{Type: "stop"}); err != nil {
		t.Fatalf("stop write failed: %v", err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read stopped event failed: %v", err)
	}
	if evt.Type != "stopped" {
		t.Fatalf("expected stopped event, got %#v", evt)
	}
	if evt.Summary == nil {
		t.Fatal("expected partial summary on stopped event")
	}
	if evt.Summary.Sent < 1 || evt.Summary.Sent >= 50 {
		t.Fatalf("expected partial run summary, got sent=%d", evt.Summary.Sent)
	}

	_ = ln.Close()
	<-acceptDone
}

func newPingFlagSet() *flag.FlagSet {
	fs := flag.NewFlagSet("ping", flag.ContinueOnError)
	fs.Bool("ipv6", false, "")
	fs.Int("count", 4, "")
	return fs
}

func newTCPPingFlagSet() *flag.FlagSet {
	fs := flag.NewFlagSet("tcpping", flag.ContinueOnError)
	fs.Int("port", defaultTCPPort, "")
	return fs
}

func openTestStore(t *testing.T) *store.Store {
	t.Helper()

	st, err := store.OpenWithConfig(filepath.Join(t.TempDir(), "test.db"), store.Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("open test store: %v", err)
	}
	t.Cleanup(func() {
		_ = st.Close()
	})
	return st
}

func waitFor(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("condition not met before timeout")
}

func float64Ptr(v float64) *float64 {
	return &v
}

func fillProbeLimiter() {
	for i := 0; i < maxConcurrentProbes; i++ {
		probeLimiter <- struct{}{}
	}
}

func drainProbeLimiter() {
	for {
		select {
		case <-probeLimiter:
		default:
			return
		}
	}
}
