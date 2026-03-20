package tcpping

import (
	"context"
	"errors"
	"net"
	"strconv"
	"time"

	"netwatcher/internal/report"
)

type Config struct {
	Count    int
	Interval time.Duration
	Timeout  time.Duration
}

func Run(host string, port int, cfg Config) (report.Report, error) {
	return RunContext(context.Background(), host, port, cfg)
}

func RunContext(ctx context.Context, host string, port int, cfg Config) (report.Report, error) {
	return RunStreamContext(ctx, host, port, cfg, nil)
}

func RunStream(host string, port int, cfg Config, onResult func(report.Result) error) (report.Report, error) {
	return RunStreamContext(context.Background(), host, port, cfg, onResult)
}

func RunStreamContext(ctx context.Context, host string, port int, cfg Config, onResult func(report.Result) error) (report.Report, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if cfg.Count <= 0 {
		return report.Report{}, errors.New("count must be greater than 0")
	}
	if port <= 0 || port > 65535 {
		return report.Report{}, errors.New("port must be in range 1-65535")
	}
	if cfg.Interval <= 0 {
		cfg.Interval = time.Second
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 2 * time.Second
	}

	addr := net.JoinHostPort(host, strconv.Itoa(port))
	results := make([]report.Result, 0, cfg.Count)
	dialer := &net.Dialer{Timeout: cfg.Timeout}

	for i := 1; i <= cfg.Count; i++ {
		if err := ctx.Err(); err != nil {
			return buildReport(host, addr, port, results), err
		}

		start := time.Now()
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		var res report.Result
		if err != nil {
			if ctx.Err() != nil {
				return buildReport(host, addr, port, results), ctx.Err()
			}
			res = report.Result{Seq: i, Error: err.Error()}
		} else {
			rtt := time.Since(start)
			_ = conn.Close()
			res = report.Result{Seq: i, RTT: rtt, Addr: addr}
		}
		results = append(results, res)
		if onResult != nil {
			if err := onResult(res); err != nil {
				return buildReport(host, addr, port, results), err
			}
		}

		if i < cfg.Count {
			if err := sleepContext(ctx, cfg.Interval); err != nil {
				return buildReport(host, addr, port, results), err
			}
		}
	}

	return buildReport(host, addr, port, results), nil
}

func buildReport(host, addr string, port int, results []report.Result) report.Report {
	return report.Report{
		Protocol: "tcp",
		Target:   host,
		Addr:     addr,
		Port:     port,
		Results:  results,
		Summary:  report.Summarize(results, len(results)),
	}
}

func sleepContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
