package portscan

import (
	"context"
	"errors"
	"fmt"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	DefaultTimeout     = 1200 * time.Millisecond
	DefaultConcurrency = 64
)

type Config struct {
	Ports       []int
	Timeout     time.Duration
	Concurrency int
}

type Result struct {
	Port  int           `json:"port"`
	State string        `json:"state"`
	RTT   time.Duration `json:"rtt,omitempty"`
	Error string        `json:"error,omitempty"`
	Addr  string        `json:"addr,omitempty"`
}

type Summary struct {
	Scanned  int           `json:"scanned"`
	Open     int           `json:"open"`
	Closed   int           `json:"closed"`
	Timeout  int           `json:"timeout"`
	Duration time.Duration `json:"duration"`
}

type Report struct {
	Protocol string   `json:"protocol"`
	Target   string   `json:"target"`
	Addr     string   `json:"addr,omitempty"`
	Results  []Result `json:"results"`
	Summary  Summary  `json:"summary"`
}

var lookupIPAddrs = net.DefaultResolver.LookupIPAddr

func ParsePorts(spec string) ([]int, error) {
	spec = strings.TrimSpace(spec)
	if spec == "" {
		return nil, errors.New("ports are required")
	}

	seen := make(map[int]struct{})
	ports := make([]int, 0, 32)

	for _, part := range strings.Split(spec, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil, errors.New("ports contain an empty segment")
		}

		if strings.Contains(part, "-") {
			bounds := strings.SplitN(part, "-", 2)
			if len(bounds) != 2 {
				return nil, fmt.Errorf("invalid port range %q", part)
			}
			start, err := parsePort(strings.TrimSpace(bounds[0]))
			if err != nil {
				return nil, fmt.Errorf("invalid port range %q", part)
			}
			end, err := parsePort(strings.TrimSpace(bounds[1]))
			if err != nil {
				return nil, fmt.Errorf("invalid port range %q", part)
			}
			if start > end {
				return nil, fmt.Errorf("invalid port range %q", part)
			}
			for port := start; port <= end; port++ {
				if _, ok := seen[port]; ok {
					continue
				}
				seen[port] = struct{}{}
				ports = append(ports, port)
			}
			continue
		}

		port, err := parsePort(part)
		if err != nil {
			return nil, err
		}
		if _, ok := seen[port]; ok {
			continue
		}
		seen[port] = struct{}{}
		ports = append(ports, port)
	}

	sort.Ints(ports)
	return ports, nil
}

func Run(host string, cfg Config) (Report, error) {
	return RunContext(context.Background(), host, cfg)
}

func RunContext(ctx context.Context, host string, cfg Config) (Report, error) {
	return RunStreamContext(ctx, host, cfg, nil)
}

func RunStreamContext(ctx context.Context, host string, cfg Config, onResult func(Result) error) (Report, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	if strings.TrimSpace(host) == "" {
		return Report{}, errors.New("host is required")
	}
	if len(cfg.Ports) == 0 {
		return Report{}, errors.New("at least one port is required")
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = DefaultTimeout
	}
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = DefaultConcurrency
	}
	if cfg.Concurrency > len(cfg.Ports) {
		cfg.Concurrency = len(cfg.Ports)
	}
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = 1
	}

	started := time.Now()
	dialHosts, resolvedAddr, err := resolveTargets(runCtx, host)
	if err != nil {
		return Report{}, err
	}

	jobs := make(chan int)
	resultsCh := make(chan Result, len(cfg.Ports))
	errCh := make(chan error, 1)

	var wg sync.WaitGroup
	for i := 0; i < cfg.Concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			dialer := &net.Dialer{Timeout: cfg.Timeout}
			for port := range jobs {
				select {
				case <-runCtx.Done():
					return
				default:
				}

				result := scanAcrossTargets(runCtx, dialer, dialHosts, port)
				select {
				case resultsCh <- result:
				case <-runCtx.Done():
					return
				}
			}
		}()
	}

	go func() {
		defer close(jobs)
		for _, port := range cfg.Ports {
			select {
			case jobs <- port:
			case <-runCtx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(resultsCh)
	}()

	results := make([]Result, 0, len(cfg.Ports))
	var callbackErr error
	for result := range resultsCh {
		if callbackErr != nil {
			continue
		}
		results = append(results, result)
		if onResult != nil {
			if err := onResult(result); err != nil {
				callbackErr = err
				cancel()
				continue
			}
		}
		select {
		case err := <-errCh:
			return buildReport(host, resolvedAddr, results, time.Since(started)), err
		default:
		}
	}

	if callbackErr != nil {
		return buildReport(host, resolvedAddr, results, time.Since(started)), callbackErr
	}
	if err := runCtx.Err(); err != nil {
		return buildReport(host, resolvedAddr, results, time.Since(started)), err
	}
	select {
	case err := <-errCh:
		return buildReport(host, resolvedAddr, results, time.Since(started)), err
	default:
	}

	return buildReport(host, resolvedAddr, results, time.Since(started)), nil
}

func buildReport(host, addr string, results []Result, duration time.Duration) Report {
	sort.Slice(results, func(i, j int) bool {
		return results[i].Port < results[j].Port
	})

	summary := Summary{
		Scanned:  len(results),
		Duration: duration,
	}
	for _, result := range results {
		switch result.State {
		case "open":
			summary.Open++
		case "timeout":
			summary.Timeout++
		default:
			summary.Closed++
		}
	}

	return Report{
		Protocol: "tcp-portscan",
		Target:   host,
		Addr:     addr,
		Results:  results,
		Summary:  summary,
	}
}

func resolveTargets(ctx context.Context, host string) ([]string, string, error) {
	if ip := net.ParseIP(host); ip != nil {
		return []string{ip.String()}, ip.String(), nil
	}

	addrs, err := lookupIPAddrs(ctx, host)
	if err != nil {
		return nil, "", err
	}
	if len(addrs) == 0 {
		return nil, "", fmt.Errorf("no address found for %s", host)
	}
	dialHosts := make([]string, 0, len(addrs))
	seen := make(map[string]struct{}, len(addrs))
	for _, addr := range addrs {
		ip := addr.IP.String()
		if ip == "" {
			continue
		}
		if _, ok := seen[ip]; ok {
			continue
		}
		seen[ip] = struct{}{}
		dialHosts = append(dialHosts, ip)
	}
	if len(dialHosts) == 0 {
		return nil, "", fmt.Errorf("no address found for %s", host)
	}
	return dialHosts, dialHosts[0], nil
}

func scanAcrossTargets(ctx context.Context, dialer *net.Dialer, hosts []string, port int) Result {
	var firstTimeout *Result
	var firstClosed *Result
	for _, host := range hosts {
		result := scanOne(ctx, dialer, host, port)
		if result.State == "open" {
			return result
		}
		if result.State == "timeout" && firstTimeout == nil {
			candidate := result
			firstTimeout = &candidate
			continue
		}
		if firstClosed == nil {
			candidate := result
			firstClosed = &candidate
		}
	}
	if firstTimeout != nil {
		return *firstTimeout
	}
	if firstClosed != nil {
		return *firstClosed
	}
	return Result{Port: port, State: "closed", Error: "connection refused"}
}

func scanOne(ctx context.Context, dialer *net.Dialer, host string, port int) Result {
	target := net.JoinHostPort(host, strconv.Itoa(port))
	started := time.Now()
	conn, err := dialer.DialContext(ctx, "tcp", target)
	if err == nil {
		rtt := time.Since(started)
		addr := ""
		if remoteAddr := conn.RemoteAddr(); remoteAddr != nil {
			addr = remoteAddr.String()
		}
		_ = conn.Close()
		return Result{
			Port:  port,
			State: "open",
			RTT:   rtt,
			Addr:  addr,
		}
	}

	state, message := classifyError(err)
	return Result{
		Port:  port,
		State: state,
		Error: message,
	}
}

func classifyError(err error) (string, string) {
	if errors.Is(err, context.Canceled) {
		return "closed", "canceled"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout", "connection timed out"
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return "timeout", "connection timed out"
	}
	if errors.Is(err, syscall.ECONNREFUSED) {
		return "closed", "connection refused"
	}
	message := strings.ToLower(err.Error())
	if strings.Contains(message, "connection refused") || strings.Contains(message, "actively refused") {
		return "closed", "connection refused"
	}
	return "closed", err.Error()
}

func parsePort(raw string) (int, error) {
	port, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("invalid port %q", raw)
	}
	if port < 1 || port > 65535 {
		return 0, fmt.Errorf("invalid port %q", raw)
	}
	return port, nil
}
