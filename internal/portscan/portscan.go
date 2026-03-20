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
	dialHost, resolvedAddr, err := resolveTarget(ctx, host)
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
				case <-ctx.Done():
					return
				default:
				}

				result := scanOne(ctx, dialer, dialHost, port)
				select {
				case resultsCh <- result:
				case <-ctx.Done():
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
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(resultsCh)
	}()

	results := make([]Result, 0, len(cfg.Ports))
	for result := range resultsCh {
		results = append(results, result)
		if onResult != nil {
			if err := onResult(result); err != nil {
				select {
				case errCh <- err:
				default:
				}
				break
			}
		}
		select {
		case err := <-errCh:
			return buildReport(host, resolvedAddr, results, time.Since(started)), err
		default:
		}
	}

	if err := ctx.Err(); err != nil {
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

func resolveTarget(ctx context.Context, host string) (string, string, error) {
	if ip := net.ParseIP(host); ip != nil {
		return host, ip.String(), nil
	}

	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return "", "", err
	}
	if len(addrs) == 0 {
		return "", "", fmt.Errorf("no address found for %s", host)
	}
	return addrs[0].IP.String(), addrs[0].IP.String(), nil
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
