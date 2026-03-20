package ping

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"os"
	"strings"
	"time"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
	"golang.org/x/net/ipv6"

	"netwatcher/internal/report"
)

type Config struct {
	Count     int
	Interval  time.Duration
	Timeout   time.Duration
	Size      int
	ForceIPv6 bool
}

func Run(host string, cfg Config) (report.Report, error) {
	return RunContext(context.Background(), host, cfg)
}

func RunContext(ctx context.Context, host string, cfg Config) (report.Report, error) {
	return RunStreamContext(ctx, host, cfg, nil)
}

func RunStream(host string, cfg Config, onResult func(report.Result) error) (report.Report, error) {
	return RunStreamContext(context.Background(), host, cfg, onResult)
}

func RunStreamContext(ctx context.Context, host string, cfg Config, onResult func(report.Result) error) (report.Report, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if cfg.Count <= 0 {
		return report.Report{}, errors.New("count must be greater than 0")
	}
	if cfg.Size < 8 {
		cfg.Size = 8
	}
	if cfg.Interval <= 0 {
		cfg.Interval = time.Second
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 2 * time.Second
	}

	ipaddr, isIPv6, err := resolveAddr(host, cfg.ForceIPv6)
	if err != nil {
		return report.Report{}, err
	}

	network := "ip4:icmp"
	proto := ipv4.ICMPTypeEcho.Protocol()
	var echoType icmp.Type = ipv4.ICMPTypeEcho
	var echoReplyType icmp.Type = ipv4.ICMPTypeEchoReply
	if isIPv6 {
		network = "ip6:ipv6-icmp"
		proto = ipv6.ICMPTypeEchoRequest.Protocol()
		echoType = ipv6.ICMPTypeEchoRequest
		echoReplyType = ipv6.ICMPTypeEchoReply
	}

	conn, err := icmp.ListenPacket(network, "")
	if err != nil {
		if isPermissionErr(err) {
			return report.Report{}, fmt.Errorf("icmp requires root or CAP_NET_RAW: %w", err)
		}
		return report.Report{}, err
	}
	defer conn.Close()
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			_ = conn.Close()
		case <-done:
		}
	}()

	id := os.Getpid() & 0xffff
	results := make([]report.Result, 0, cfg.Count)
	dst := ipaddr

	for i := 1; i <= cfg.Count; i++ {
		if err := ctx.Err(); err != nil {
			return buildReport(host, ipaddr.String(), results), err
		}
		res, err := sendOnce(ctx, conn, dst, proto, echoType, echoReplyType, id, i, cfg.Timeout, cfg.Size)
		if err != nil {
			return buildReport(host, ipaddr.String(), results), err
		}
		results = append(results, res)
		if onResult != nil {
			if err := onResult(res); err != nil {
				return buildReport(host, ipaddr.String(), results), err
			}
		}
		if i < cfg.Count {
			if err := sleepContext(ctx, cfg.Interval); err != nil {
				return buildReport(host, ipaddr.String(), results), err
			}
		}
	}

	return buildReport(host, ipaddr.String(), results), nil
}

func buildReport(host, addr string, results []report.Result) report.Report {
	return report.Report{
		Protocol: "icmp",
		Target:   host,
		Addr:     addr,
		Results:  results,
		Summary:  report.Summarize(results, len(results)),
	}
}

func resolveAddr(host string, forceIPv6 bool) (*net.IPAddr, bool, error) {
	if forceIPv6 {
		ip6, err := net.ResolveIPAddr("ip6", host)
		return ip6, true, err
	}

	ip4, err4 := net.ResolveIPAddr("ip4", host)
	if err4 == nil {
		return ip4, false, nil
	}

	ip6, err6 := net.ResolveIPAddr("ip6", host)
	if err6 == nil {
		return ip6, true, nil
	}

	return nil, false, err4
}

func sendOnce(ctx context.Context, conn *icmp.PacketConn, dst net.Addr, proto int, echoType, echoReplyType icmp.Type, id, seq int, timeout time.Duration, size int) (report.Result, error) {
	data := make([]byte, size)
	binary.BigEndian.PutUint64(data[:8], uint64(time.Now().UnixNano()))

	msg := icmp.Message{
		Type: echoType,
		Code: 0,
		Body: &icmp.Echo{
			ID:   id,
			Seq:  seq,
			Data: data,
		},
	}
	b, err := msg.Marshal(nil)
	if err != nil {
		return report.Result{Seq: seq, Error: err.Error()}, nil
	}

	start := time.Now()
	if _, err := conn.WriteTo(b, dst); err != nil {
		if ctx.Err() != nil {
			return report.Result{}, ctx.Err()
		}
		return report.Result{Seq: seq, Error: err.Error()}, nil
	}

	buf := make([]byte, 1500)
	deadline := time.Now().Add(timeout)
	_ = conn.SetReadDeadline(deadline)

	// Limit packets processed to prevent excessive looping on noisy networks
	maxPackets := 100
	packetsProcessed := 0

	for {
		n, peer, err := conn.ReadFrom(buf)
		if err != nil {
			if ctx.Err() != nil {
				return report.Result{}, ctx.Err()
			}
			if nerr, ok := err.(net.Error); ok && nerr.Timeout() {
				return report.Result{Seq: seq, Error: "timeout"}, nil
			}
			return report.Result{Seq: seq, Error: err.Error()}, nil
		}

		rm, err := icmp.ParseMessage(proto, buf[:n])
		if err != nil {
			packetsProcessed++
			if packetsProcessed >= maxPackets {
				return report.Result{Seq: seq, Error: "timeout"}, nil
			}
			continue
		}

		if rm.Type != echoReplyType {
			packetsProcessed++
			if packetsProcessed >= maxPackets {
				return report.Result{Seq: seq, Error: "timeout"}, nil
			}
			continue
		}

		body, ok := rm.Body.(*icmp.Echo)
		if !ok {
			packetsProcessed++
			if packetsProcessed >= maxPackets {
				return report.Result{Seq: seq, Error: "timeout"}, nil
			}
			continue
		}
		if body.ID != id || body.Seq != seq {
			packetsProcessed++
			if packetsProcessed >= maxPackets {
				return report.Result{Seq: seq, Error: "timeout"}, nil
			}
			continue
		}

		rtt := time.Since(start)
		return report.Result{Seq: seq, RTT: rtt, Addr: peer.String()}, nil
	}
}

func isPermissionErr(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "permission") || strings.Contains(msg, "operation not permitted")
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
