package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/gorilla/websocket"

	"netwatcher/internal/cache"
	"netwatcher/internal/objectstore"
	"netwatcher/internal/ping"
	"netwatcher/internal/portscan"
	"netwatcher/internal/report"
	"netwatcher/internal/store"
	"netwatcher/internal/tcpping"
)

const (
	defaultProbeCount    = 4
	defaultProbeInterval = time.Second
	defaultProbeTimeout  = 2 * time.Second
	defaultPingSize      = 32
	defaultTCPPort       = 80
	defaultScanPorts     = "22,80,443,8080"
	defaultScanWorkers   = 64
	maxProbeCount        = 100
	minProbeInterval     = 100 * time.Millisecond
	maxProbeInterval     = 60 * time.Second
	minProbeTimeout      = 100 * time.Millisecond
	maxProbeTimeout      = 60 * time.Second
	minPingSize          = 8
	maxPingSize          = 65535
	minScanConcurrency   = 1
	maxScanConcurrency   = 256
	maxScanPorts         = 4096
	wsWriteTimeout       = 10 * time.Second
	wsReadTimeout        = 60 * time.Second
	maxJSONBodyBytes     = 8 << 10
	maxWSMessageBytes    = 4 << 10
	maxHostLength        = 255
	maxHistoryLimit      = 1000
	maxConcurrentProbes  = 8
)

type boolFlag interface {
	IsBoolFlag() bool
}

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "ping":
		runPing(os.Args[2:])
	case "tcpping":
		runTCPPing(os.Args[2:])
	case "portscan":
		runPortScan(os.Args[2:])
	case "serve":
		runServe(os.Args[2:])
	case "help", "-h", "--help":
		usage()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", os.Args[1])
		usage()
		os.Exit(2)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, "NetWatcher - Networking toolkit")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Usage:")
	fmt.Fprintln(os.Stderr, "  netwatcher ping [flags] <host>")
	fmt.Fprintln(os.Stderr, "  netwatcher tcpping [flags] <host>[:port]")
	fmt.Fprintln(os.Stderr, "  netwatcher portscan [flags] <host>")
	fmt.Fprintln(os.Stderr, "  netwatcher serve [flags]")
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "Commands:")
	fmt.Fprintln(os.Stderr, "  ping     ICMP echo (requires root or CAP_NET_RAW)")
	fmt.Fprintln(os.Stderr, "  tcpping  TCP connect latency")
	fmt.Fprintln(os.Stderr, "  portscan TCP connect port scan")
	fmt.Fprintln(os.Stderr, "  serve    Web UI + REST API")
}

func runPing(args []string) {
	fs := flag.NewFlagSet("ping", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	count := fs.Int("count", 4, "number of probes")
	interval := fs.Duration("interval", time.Second, "interval between probes")
	timeout := fs.Duration("timeout", 2*time.Second, "per-probe timeout")
	size := fs.Int("size", 32, "ICMP payload size in bytes")
	ipv6 := fs.Bool("ipv6", false, "force IPv6")
	jsonOut := fs.Bool("json", false, "JSON output")

	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: netwatcher ping [flags] <host>")
		fs.PrintDefaults()
	}

	if err := fs.Parse(normalizeArgs(fs, args)); err != nil {
		os.Exit(2)
	}

	if fs.NArg() < 1 {
		fs.Usage()
		os.Exit(2)
	}

	host := fs.Arg(0)
	cfg, err := normalizePingConfig(*count, *interval, *timeout, *size, *ipv6)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	rep, err := ping.Run(host, cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if *jsonOut {
		printJSON(rep)
		return
	}
	printPing(rep)
}

func runTCPPing(args []string) {
	fs := flag.NewFlagSet("tcpping", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	count := fs.Int("count", 4, "number of probes")
	interval := fs.Duration("interval", time.Second, "interval between probes")
	timeout := fs.Duration("timeout", 2*time.Second, "per-probe timeout")
	port := fs.Int("port", 80, "TCP port")
	jsonOut := fs.Bool("json", false, "JSON output")

	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: netwatcher tcpping [flags] <host>[:port]")
		fs.PrintDefaults()
	}

	if err := fs.Parse(normalizeArgs(fs, args)); err != nil {
		os.Exit(2)
	}

	if fs.NArg() < 1 {
		fs.Usage()
		os.Exit(2)
	}

	host := fs.Arg(0)
	portFromFlag := false
	fs.Visit(func(f *flag.Flag) {
		if f.Name == "port" {
			portFromFlag = true
		}
	})

	if !portFromFlag {
		parsedHost, parsedPort, ok := splitHostPort(host)
		if ok {
			host = parsedHost
			*port = parsedPort
		}
	}

	host, resolvedPort, cfg, err := normalizeTCPPingRequest(host, *port, *count, *interval, *timeout)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	rep, err := tcpping.Run(host, resolvedPort, cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if *jsonOut {
		printJSON(rep)
		return
	}
	printTCPPing(rep)
}

func runPortScan(args []string) {
	fs := flag.NewFlagSet("portscan", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	portsSpec := fs.String("ports", defaultScanPorts, "comma-separated ports and ranges (for example 22,80,443,8000-8100)")
	timeout := fs.Duration("timeout", defaultProbeTimeout, "per-port timeout")
	concurrency := fs.Int("concurrency", defaultScanWorkers, "maximum parallel connection attempts")
	jsonOut := fs.Bool("json", false, "JSON output")

	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: netwatcher portscan [flags] <host>")
		fs.PrintDefaults()
	}

	if err := fs.Parse(normalizeArgs(fs, args)); err != nil {
		os.Exit(2)
	}

	if fs.NArg() < 1 {
		fs.Usage()
		os.Exit(2)
	}

	host, ports, cfg, err := normalizePortScanRequest(fs.Arg(0), *portsSpec, *timeout, *concurrency)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	rep, err := portscan.Run(host, cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if *jsonOut {
		printPortScanJSON(rep)
		return
	}
	printPortScan(rep, ports)
}

func runServe(args []string) {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	listen := fs.String("listen", envString("NETWATCHER_LISTEN", "127.0.0.1:8080"), "listen address")
	staticDir := fs.String("static", envString("NETWATCHER_STATIC_DIR", "web"), "static directory for UI assets")
	dbDSN := fs.String("db-dsn", envString("NETWATCHER_DB_DSN", ""), "postgres/timescaledb DSN")
	dbBatch := fs.Int("db-batch", envInt("NETWATCHER_DB_BATCH", 100), "database batch insert size")
	dbFlush := fs.Duration("db-flush", envDuration("NETWATCHER_DB_FLUSH", 1*time.Second), "database flush interval")
	dbRetention := fs.Duration("db-retention", envDuration("NETWATCHER_DB_RETENTION", 168*time.Hour), "retention duration (0 to disable)")
	dbCleanup := fs.Duration("db-cleanup", envDuration("NETWATCHER_DB_CLEANUP", 1*time.Hour), "retention cleanup interval")
	dbMaxOpen := fs.Int("db-max-open", envInt("NETWATCHER_DB_MAX_OPEN", 20), "database max open connections")
	dbMaxIdle := fs.Int("db-max-idle", envInt("NETWATCHER_DB_MAX_IDLE", 10), "database max idle connections")
	dbConnMaxLifetime := fs.Duration("db-conn-max-lifetime", envDuration("NETWATCHER_DB_CONN_MAX_LIFETIME", 30*time.Minute), "database connection max lifetime")
	timescale := fs.Bool("timescale", envBool("NETWATCHER_TIMESCALE", false), "require TimescaleDB extension when using postgres")
	redisAddr := fs.String("redis-addr", envString("NETWATCHER_REDIS_ADDR", ""), "Redis address for history cache")
	redisPassword := fs.String("redis-password", envString("NETWATCHER_REDIS_PASSWORD", ""), "Redis password")
	redisDB := fs.Int("redis-db", envInt("NETWATCHER_REDIS_DB", 0), "Redis logical DB")
	redisPrefix := fs.String("redis-prefix", envString("NETWATCHER_REDIS_PREFIX", "netwatcher"), "Redis key prefix")
	redisTTL := fs.Duration("redis-cache-ttl", envDuration("NETWATCHER_REDIS_CACHE_TTL", 3*time.Second), "Redis history cache TTL")
	s3Endpoint := fs.String("s3-endpoint", envString("NETWATCHER_S3_ENDPOINT", ""), "S3-compatible endpoint")
	s3AccessKey := fs.String("s3-access-key", envString("NETWATCHER_S3_ACCESS_KEY", ""), "S3 access key")
	s3SecretKey := fs.String("s3-secret-key", envString("NETWATCHER_S3_SECRET_KEY", ""), "S3 secret key")
	s3Bucket := fs.String("s3-bucket", envString("NETWATCHER_S3_BUCKET", ""), "S3 bucket for exports and artifacts")
	s3Region := fs.String("s3-region", envString("NETWATCHER_S3_REGION", "us-east-1"), "S3 region")
	s3Prefix := fs.String("s3-prefix", envString("NETWATCHER_S3_PREFIX", "netwatcher"), "S3 object prefix")
	s3UseSSL := fs.Bool("s3-ssl", envBool("NETWATCHER_S3_SSL", false), "use TLS for S3-compatible endpoint")

	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: netwatcher serve [flags]")
		fs.PrintDefaults()
	}

	if err := fs.Parse(normalizeArgs(fs, args)); err != nil {
		os.Exit(2)
	}

	defer func() {
		appStore = nil
		appCache = nil
		appObjectStore = nil
	}()

	st, err := store.OpenConfigured(store.Config{
		DSN:              *dbDSN,
		BatchSize:        *dbBatch,
		FlushInterval:    *dbFlush,
		Retention:        *dbRetention,
		CleanupInterval:  *dbCleanup,
		MaxOpenConns:     *dbMaxOpen,
		MaxIdleConns:     *dbMaxIdle,
		ConnMaxLifetime:  *dbConnMaxLifetime,
		RequireTimescale: *timescale,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	appStore = st
	defer func() {
		_ = st.Close()
	}()

	rc, err := cache.Open(cache.Config{
		Addr:     *redisAddr,
		Password: *redisPassword,
		DB:       *redisDB,
		Prefix:   *redisPrefix,
		TTL:      *redisTTL,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	appCache = rc
	if rc != nil {
		defer func() {
			_ = rc.Close()
		}()
	}

	objStore, err := objectstore.Open(objectstore.Config{
		Endpoint:  *s3Endpoint,
		AccessKey: *s3AccessKey,
		SecretKey: *s3SecretKey,
		Region:    *s3Region,
		Bucket:    *s3Bucket,
		Prefix:    *s3Prefix,
		UseSSL:    *s3UseSSL,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	appObjectStore = objStore
	if objStore != nil {
		defer func() {
			_ = objStore.Close()
		}()
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/api/ping", handlePing)
	mux.HandleFunc("/api/tcpping", handleTCPPing)
	mux.HandleFunc("/api/portscan", handlePortScan)
	mux.HandleFunc("/api/history", handleHistory)
	mux.HandleFunc("/api/export/history", handleHistoryExport)
	mux.HandleFunc("/ws", handleWS)
	mux.Handle("/", http.FileServer(http.Dir(*staticDir)))

	srv := &http.Server{
		Addr:              *listen,
		Handler:           withSecurityHeaders(mux),
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	fmt.Printf("NetWatcher UI listening on http://%s\n", *listen)
	fmt.Printf("Serving static files from %s\n", *staticDir)
	fmt.Printf("Database: postgres/timescale\n")
	fmt.Printf("DB batch=%d flush=%s retention=%s max-open=%d max-idle=%d timescale=%t\n", *dbBatch, dbFlush.String(), dbRetention.String(), *dbMaxOpen, *dbMaxIdle, *timescale)
	if rc != nil {
		fmt.Printf("Redis cache: %s db=%d ttl=%s\n", *redisAddr, *redisDB, redisTTL.String())
	}
	if objStore != nil {
		fmt.Printf("Object storage: %s bucket=%s prefix=%s\n", *s3Endpoint, *s3Bucket, *s3Prefix)
	}

	// Handle graceful shutdown on SIGINT/SIGTERM
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\nShutting down gracefully...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "Shutdown error: %v\n", err)
		}
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func splitHostPort(target string) (string, int, bool) {
	if !strings.Contains(target, ":") {
		return "", 0, false
	}
	host, portStr, err := net.SplitHostPort(target)
	if err != nil {
		return "", 0, false
	}
	port, err := parsePort(portStr)
	if err != nil {
		return "", 0, false
	}
	return host, port, true
}

func normalizeArgs(fs *flag.FlagSet, args []string) []string {
	if len(args) == 0 {
		return args
	}

	takesValue := make(map[string]bool)
	fs.VisitAll(func(f *flag.Flag) {
		_, isBool := f.Value.(boolFlag)
		takesValue[f.Name] = !isBool
	})

	flags := make([]string, 0, len(args))
	pos := make([]string, 0, len(args))

	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "--" {
			pos = append(pos, args[i+1:]...)
			break
		}
		if strings.HasPrefix(a, "-") {
			flags = append(flags, a)
			name := strings.TrimLeft(a, "-")
			if idx := strings.Index(name, "="); idx >= 0 {
				name = name[:idx]
			}
			if takesValue[name] && !strings.Contains(a, "=") && i+1 < len(args) {
				flags = append(flags, args[i+1])
				i++
			}
			continue
		}
		pos = append(pos, a)
	}

	return append(flags, pos...)
}

func normalizePingConfig(count int, interval, timeout time.Duration, size int, forceIPv6 bool) (ping.Config, error) {
	normalizedCount, err := normalizeProbeCount(count)
	if err != nil {
		return ping.Config{}, err
	}
	normalizedInterval, err := normalizeProbeInterval(interval)
	if err != nil {
		return ping.Config{}, err
	}
	normalizedTimeout, err := normalizeProbeTimeout(timeout)
	if err != nil {
		return ping.Config{}, err
	}
	normalizedSize, err := normalizePingSize(size)
	if err != nil {
		return ping.Config{}, err
	}

	return ping.Config{
		Count:     normalizedCount,
		Interval:  normalizedInterval,
		Timeout:   normalizedTimeout,
		Size:      normalizedSize,
		ForceIPv6: forceIPv6,
	}, nil
}

func normalizeTCPPingRequest(host string, port, count int, interval, timeout time.Duration) (string, int, tcpping.Config, error) {
	var err error
	host, err = normalizeHost(host)
	if err != nil {
		return "", 0, tcpping.Config{}, err
	}
	if port == 0 {
		port = defaultTCPPort
	}
	if port < 1 || port > 65535 {
		return "", 0, tcpping.Config{}, fmt.Errorf("port must be 1-65535")
	}

	normalizedCount, err := normalizeProbeCount(count)
	if err != nil {
		return "", 0, tcpping.Config{}, err
	}
	normalizedInterval, err := normalizeProbeInterval(interval)
	if err != nil {
		return "", 0, tcpping.Config{}, err
	}
	normalizedTimeout, err := normalizeProbeTimeout(timeout)
	if err != nil {
		return "", 0, tcpping.Config{}, err
	}

	return host, port, tcpping.Config{
		Count:    normalizedCount,
		Interval: normalizedInterval,
		Timeout:  normalizedTimeout,
	}, nil
}

func normalizePortScanRequest(host, portsSpec string, timeout time.Duration, concurrency int) (string, []int, portscan.Config, error) {
	var err error
	host, err = normalizeHost(host)
	if err != nil {
		return "", nil, portscan.Config{}, err
	}

	ports, err := portscan.ParsePorts(portsSpec)
	if err != nil {
		return "", nil, portscan.Config{}, err
	}
	if len(ports) > maxScanPorts {
		return "", nil, portscan.Config{}, fmt.Errorf("scan is limited to %d ports per request", maxScanPorts)
	}

	normalizedTimeout, err := normalizeProbeTimeout(timeout)
	if err != nil {
		return "", nil, portscan.Config{}, err
	}

	if concurrency == 0 {
		concurrency = defaultScanWorkers
	}
	if concurrency < minScanConcurrency || concurrency > maxScanConcurrency {
		return "", nil, portscan.Config{}, fmt.Errorf("concurrency must be %d-%d", minScanConcurrency, maxScanConcurrency)
	}
	if concurrency > len(ports) {
		concurrency = len(ports)
	}

	return host, ports, portscan.Config{
		Ports:       ports,
		Timeout:     normalizedTimeout,
		Concurrency: concurrency,
	}, nil
}

func normalizeHost(host string) (string, error) {
	host = strings.TrimSpace(host)
	if host == "" {
		return "", fmt.Errorf("host is required")
	}
	if len(host) > maxHostLength {
		return "", fmt.Errorf("host is too long")
	}
	for _, b := range []byte(host) {
		if b < 32 || b == 127 {
			return "", fmt.Errorf("host contains invalid characters")
		}
	}
	return host, nil
}

func normalizeProbeCount(count int) (int, error) {
	if count == 0 {
		count = defaultProbeCount
	}
	if count < 1 || count > maxProbeCount {
		return 0, fmt.Errorf("count must be 1-%d", maxProbeCount)
	}
	return count, nil
}

func normalizeProbeInterval(interval time.Duration) (time.Duration, error) {
	if interval <= 0 {
		interval = defaultProbeInterval
	}
	if interval < minProbeInterval || interval > maxProbeInterval {
		return 0, fmt.Errorf("interval must be %s-%s", minProbeInterval, maxProbeInterval)
	}
	return interval, nil
}

func normalizeProbeTimeout(timeout time.Duration) (time.Duration, error) {
	if timeout <= 0 {
		timeout = defaultProbeTimeout
	}
	if timeout < minProbeTimeout || timeout > maxProbeTimeout {
		return 0, fmt.Errorf("timeout must be %s-%s", minProbeTimeout, maxProbeTimeout)
	}
	return timeout, nil
}

func normalizePingSize(size int) (int, error) {
	if size == 0 {
		size = defaultPingSize
	}
	if size < minPingSize || size > maxPingSize {
		return 0, fmt.Errorf("size must be %d-%d bytes", minPingSize, maxPingSize)
	}
	return size, nil
}

func parsePort(portStr string) (int, error) {
	var port int
	_, err := fmt.Sscanf(portStr, "%d", &port)
	if err != nil {
		return 0, err
	}
	if port < 1 || port > 65535 {
		return 0, fmt.Errorf("port out of range")
	}
	return port, nil
}

func parseHistoryQuery(values url.Values) (string, string, int, int, error) {
	reqType := strings.ToLower(strings.TrimSpace(values.Get("type")))
	host := strings.TrimSpace(values.Get("host"))
	portStr := strings.TrimSpace(values.Get("port"))
	limitStr := strings.TrimSpace(values.Get("limit"))

	if reqType != "ping" && reqType != "tcpping" {
		return "", "", 0, 0, fmt.Errorf("type must be ping or tcpping")
	}
	if host == "" {
		return "", "", 0, 0, fmt.Errorf("host is required")
	}

	port := 0
	if reqType == "tcpping" {
		if parsedHost, parsedPort, ok := splitHostPort(host); ok {
			host = parsedHost
			if port == 0 {
				port = parsedPort
			}
		}
	}
	if normalizedHost, err := normalizeHost(host); err != nil {
		return "", "", 0, 0, err
	} else {
		host = normalizedHost
	}

	if portStr != "" {
		p, err := parsePort(portStr)
		if err != nil {
			return "", "", 0, 0, fmt.Errorf("invalid port")
		}
		port = p
	}

	limit := 120
	if limitStr != "" {
		var parsed int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsed); err != nil || parsed < 1 || parsed > maxHistoryLimit {
			return "", "", 0, 0, fmt.Errorf("limit must be 1-%d", maxHistoryLimit)
		}
		limit = parsed
	}

	return reqType, host, port, limit, nil
}

func historyCacheKey(reqType, host string, port, limit int) string {
	return fmt.Sprintf("history:%s:%s:%d:%d", reqType, host, port, limit)
}

func exportFileName(reqType, host string, port int, format string) string {
	baseHost := strings.NewReplacer(":", "_", "/", "_", "\\", "_", " ", "_").Replace(host)
	if port > 0 {
		baseHost = fmt.Sprintf("%s_%d", baseHost, port)
	}
	return fmt.Sprintf("%s_%s.%s", reqType, baseHost, format)
}

func buildExportObjectKey(reqType, host string, port int, format string) string {
	return fmt.Sprintf("exports/%s/%d/%s", reqType, time.Now().UTC().Unix(), exportFileName(reqType, host, port, format))
}

func historyCSVRows(points []store.HistoryPoint) [][]string {
	rows := make([][]string, 0, len(points)+1)
	rows = append(rows, []string{"timestamp_ms", "sequence", "rtt_ms", "error"})
	for _, point := range points {
		rtt := ""
		if point.RttMs != nil {
			rtt = fmt.Sprintf("%.3f", *point.RttMs)
		}
		rows = append(rows, []string{
			strconv.FormatInt(point.Ts, 10),
			strconv.Itoa(point.Seq),
			rtt,
			point.Error,
		})
	}
	return rows
}

func envString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func printPing(rep report.Report) {
	fmt.Printf("PING %s (%s)\n", rep.Target, rep.Addr)
	for _, r := range rep.Results {
		if r.Error != "" {
			fmt.Printf("seq=%d %s\n", r.Seq, r.Error)
			continue
		}
		addr := r.Addr
		if addr == "" {
			addr = rep.Addr
		}
		fmt.Printf("reply from %s: seq=%d time=%s\n", addr, r.Seq, formatDuration(r.RTT))
	}
	printSummary(rep)
}

func printTCPPing(rep report.Report) {
	fmt.Printf("TCP PING %s (%s)\n", rep.Target, rep.Addr)
	for _, r := range rep.Results {
		if r.Error != "" {
			fmt.Printf("seq=%d %s\n", r.Seq, r.Error)
			continue
		}
		fmt.Printf("seq=%d time=%s\n", r.Seq, formatDuration(r.RTT))
	}
	printSummary(rep)
}

func printPortScan(rep portscan.Report, ports []int) {
	fmt.Printf("TCP PORT SCAN %s", rep.Target)
	if rep.Addr != "" {
		fmt.Printf(" (%s)", rep.Addr)
	}
	fmt.Println()

	for _, result := range rep.Results {
		if result.State == "open" {
			fmt.Printf("port=%d state=open time=%s", result.Port, formatDuration(result.RTT))
		} else {
			fmt.Printf("port=%d state=%s", result.Port, result.State)
		}
		if result.Addr != "" {
			fmt.Printf(" addr=%s", result.Addr)
		}
		if result.Error != "" && result.State != "open" {
			fmt.Printf(" error=%s", result.Error)
		}
		fmt.Println()
	}

	fmt.Printf("--- %s tcp-portscan statistics ---\n", rep.Target)
	fmt.Printf("%d ports scanned, %d open, %d closed, %d timeout, completed in %s\n",
		rep.Summary.Scanned,
		rep.Summary.Open,
		rep.Summary.Closed,
		rep.Summary.Timeout,
		rep.Summary.Duration.Round(time.Millisecond),
	)
	if len(ports) > 0 {
		fmt.Printf("%d requested ports\n", len(ports))
	}
}

func printSummary(rep report.Report) {
	fmt.Printf("--- %s %s statistics ---\n", rep.Target, rep.Protocol)
	fmt.Printf("%d probes, %d replies, %.1f%% loss\n", rep.Summary.Sent, rep.Summary.Recv, rep.Summary.Loss)
	if rep.Summary.Recv > 0 {
		fmt.Printf("rtt min/avg/max/stddev = %s/%s/%s/%s\n",
			formatDuration(rep.Summary.Min),
			formatDuration(rep.Summary.Avg),
			formatDuration(rep.Summary.Max),
			formatDuration(rep.Summary.StdDev),
		)
	}
}

type jsonResult struct {
	Seq   int      `json:"seq,omitempty"`
	Port  int      `json:"port,omitempty"`
	State string   `json:"state,omitempty"`
	RTT   string   `json:"rtt,omitempty"`
	RTTMs *float64 `json:"rtt_ms,omitempty"`
	Error string   `json:"error,omitempty"`
	Addr  string   `json:"addr,omitempty"`
}

type jsonSummary struct {
	Sent     int     `json:"sent"`
	Recv     int     `json:"recv"`
	Loss     float64 `json:"loss"`
	Min      string  `json:"min,omitempty"`
	Avg      string  `json:"avg,omitempty"`
	Max      string  `json:"max,omitempty"`
	StdDev   string  `json:"stddev,omitempty"`
	Scanned  int     `json:"scanned,omitempty"`
	Open     int     `json:"open,omitempty"`
	Closed   int     `json:"closed,omitempty"`
	Timeout  int     `json:"timeout,omitempty"`
	Duration string  `json:"duration,omitempty"`
}

type jsonReport struct {
	Protocol string       `json:"protocol"`
	Target   string       `json:"target"`
	Addr     string       `json:"addr"`
	Port     int          `json:"port,omitempty"`
	Results  []jsonResult `json:"results"`
	Summary  jsonSummary  `json:"summary"`
}

func printJSON(rep report.Report) {
	jr := toJSONReport(rep)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(jr)
}

func printPortScanJSON(rep portscan.Report) {
	jr := toJSONPortScanReport(rep)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(jr)
}

func formatDuration(d time.Duration) string {
	ms := float64(d) / float64(time.Millisecond)
	return fmt.Sprintf("%.3fms", ms)
}

type apiError struct {
	Error string `json:"error"`
}

type pingRequest struct {
	Host       string `json:"host"`
	Count      int    `json:"count"`
	IntervalMs int    `json:"interval_ms"`
	TimeoutMs  int    `json:"timeout_ms"`
	Size       int    `json:"size"`
	IPv6       bool   `json:"ipv6"`
}

type tcpPingRequest struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Count      int    `json:"count"`
	IntervalMs int    `json:"interval_ms"`
	TimeoutMs  int    `json:"timeout_ms"`
}

type portScanRequest struct {
	Host        string `json:"host"`
	Ports       string `json:"ports"`
	TimeoutMs   int    `json:"timeout_ms"`
	Concurrency int    `json:"concurrency"`
}

type wsRequest struct {
	Type        string `json:"type"`
	Host        string `json:"host"`
	Port        int    `json:"port,omitempty"`
	Ports       string `json:"ports,omitempty"`
	Count       int    `json:"count"`
	IntervalMs  int    `json:"interval_ms"`
	TimeoutMs   int    `json:"timeout_ms"`
	Size        int    `json:"size"`
	IPv6        bool   `json:"ipv6"`
	Concurrency int    `json:"concurrency,omitempty"`
}

type wsEvent struct {
	Type     string       `json:"type"`
	Protocol string       `json:"protocol,omitempty"`
	Target   string       `json:"target,omitempty"`
	Addr     string       `json:"addr,omitempty"`
	Port     int          `json:"port,omitempty"`
	Ts       int64        `json:"ts,omitempty"`
	Result   *jsonResult  `json:"result,omitempty"`
	Summary  *jsonSummary `json:"summary,omitempty"`
	Error    string       `json:"error,omitempty"`
}

type wsWriter struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

type wsSession struct {
	writer *wsWriter

	mu     sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

func (w *wsWriter) WriteEvent(evt wsEvent) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if err := w.conn.SetWriteDeadline(time.Now().Add(wsWriteTimeout)); err != nil {
		return err
	}
	return w.conn.WriteJSON(evt)
}

func (s *wsSession) start(req wsRequest) bool {
	s.mu.Lock()
	if s.cancel != nil {
		s.mu.Unlock()
		return false
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	s.cancel = cancel
	s.done = done
	s.mu.Unlock()

	go func() {
		defer close(done)
		err := runWSRequest(ctx, s.writer, req)
		if err != nil && !errors.Is(err, context.Canceled) {
			_ = s.writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
		}
		s.clear(done)
	}()
	return true
}

func (s *wsSession) stop() bool {
	s.mu.Lock()
	cancel := s.cancel
	s.mu.Unlock()
	if cancel == nil {
		return false
	}
	cancel()
	return true
}

func (s *wsSession) clear(done chan struct{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.done != done {
		return
	}
	s.cancel = nil
	s.done = nil
}

func (s *wsSession) close() {
	s.stop()
}

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return isAllowedWSOrigin(r, origin)
	},
}

var appStore *store.Store
var appCache *cache.Cache
var appObjectStore *objectstore.Client
var probeLimiter = make(chan struct{}, maxConcurrentProbes)
var rejectedProbeRequests atomic.Uint64

func handleHealthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}

	type healthDep struct {
		Enabled bool   `json:"enabled"`
		Healthy bool   `json:"healthy"`
		Driver  string `json:"driver,omitempty"`
		Error   string `json:"error,omitempty"`
	}
	type healthResponse struct {
		OK          bool      `json:"ok"`
		Time        time.Time `json:"time"`
		Database    healthDep `json:"database"`
		Redis       healthDep `json:"redis"`
		ObjectStore healthDep `json:"object_storage"`
	}

	resp := healthResponse{
		OK:   true,
		Time: time.Now().UTC(),
		Database: healthDep{
			Enabled: appStore != nil,
		},
		Redis: healthDep{
			Enabled: appCache != nil,
		},
		ObjectStore: healthDep{
			Enabled: appObjectStore != nil,
		},
	}

	if appStore != nil {
		resp.Database.Driver = appStore.Driver()
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		err := appStore.Ping(ctx)
		cancel()
		resp.Database.Healthy = err == nil
		if err != nil {
			resp.Database.Error = err.Error()
			resp.OK = false
		}
	}
	if appCache != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		err := appCache.Ping(ctx)
		cancel()
		resp.Redis.Healthy = err == nil
		if err != nil {
			resp.Redis.Error = err.Error()
			resp.OK = false
		}
	}
	if appObjectStore != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		err := appObjectStore.Ping(ctx)
		cancel()
		resp.ObjectStore.Healthy = err == nil
		if err != nil {
			resp.ObjectStore.Error = err.Error()
			resp.OK = false
		}
	}

	status := http.StatusOK
	if !resp.OK {
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, resp)
}

func handlePing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if !isAllowedRequestOrigin(r) {
		writeJSON(w, http.StatusForbidden, apiError{Error: "forbidden origin"})
		return
	}

	var req pingRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	if normalizedHost, err := normalizeHost(req.Host); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	} else {
		req.Host = normalizedHost
	}

	count := req.Count
	interval := time.Second
	if req.IntervalMs > 0 {
		interval = time.Duration(req.IntervalMs) * time.Millisecond
	}
	timeout := 2 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}
	size := req.Size

	cfg, err := normalizePingConfig(count, interval, timeout, size, req.IPv6)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	release, ok := tryAcquireProbeSlot()
	if !ok {
		writeJSON(w, http.StatusTooManyRequests, apiError{Error: "server busy, try again"})
		return
	}
	defer release()

	rep, err := ping.RunStreamContext(r.Context(), req.Host, cfg, func(res report.Result) error {
		storeResult("ping", req.Host, res.Addr, 0, res, time.Now())
		return nil
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, toJSONReport(rep))
}

func handleTCPPing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if !isAllowedRequestOrigin(r) {
		writeJSON(w, http.StatusForbidden, apiError{Error: "forbidden origin"})
		return
	}

	var req tcpPingRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	host := req.Host
	port := req.Port
	if parsedHost, parsedPort, ok := splitHostPort(host); ok {
		host = parsedHost
		if port == 0 {
			port = parsedPort
		}
	}
	if port == 0 {
		port = 80
	}

	count := req.Count
	interval := time.Second
	if req.IntervalMs > 0 {
		interval = time.Duration(req.IntervalMs) * time.Millisecond
	}
	timeout := 2 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	host, port, cfg, err := normalizeTCPPingRequest(host, port, count, interval, timeout)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	release, ok := tryAcquireProbeSlot()
	if !ok {
		writeJSON(w, http.StatusTooManyRequests, apiError{Error: "server busy, try again"})
		return
	}
	defer release()

	rep, err := tcpping.RunStreamContext(r.Context(), host, port, cfg, func(res report.Result) error {
		storeResult("tcpping", host, res.Addr, port, res, time.Now())
		return nil
	})
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, toJSONReport(rep))
}

func handlePortScan(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if !isAllowedRequestOrigin(r) {
		writeJSON(w, http.StatusForbidden, apiError{Error: "forbidden origin"})
		return
	}

	var req portScanRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	timeout := defaultProbeTimeout
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	host, _, cfg, err := normalizePortScanRequest(req.Host, req.Ports, timeout, req.Concurrency)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	release, ok := tryAcquireProbeSlot()
	if !ok {
		writeJSON(w, http.StatusTooManyRequests, apiError{Error: "server busy, try again"})
		return
	}
	defer release()

	rep, err := portscan.RunContext(r.Context(), host, cfg)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, toJSONPortScanReport(rep))
}

func handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if appStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{Error: "storage not available"})
		return
	}

	reqType, host, port, limit, err := parseHistoryQuery(r.URL.Query())
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}

	cacheKey := historyCacheKey(reqType, host, port, limit)
	if appCache != nil {
		var cached []store.HistoryPoint
		ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
		hit, cacheErr := appCache.GetJSON(ctx, cacheKey, &cached)
		cancel()
		if cacheErr == nil && hit {
			writeJSON(w, http.StatusOK, cached)
			return
		}
	}

	points, err := appStore.QueryHistory(reqType, host, port, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}
	if appCache != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 250*time.Millisecond)
		_ = appCache.SetJSON(ctx, cacheKey, points)
		cancel()
	}
	writeJSON(w, http.StatusOK, points)
}

func handleHistoryExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, apiError{Error: "method not allowed"})
		return
	}
	if appStore == nil {
		writeJSON(w, http.StatusServiceUnavailable, apiError{Error: "storage not available"})
		return
	}

	reqType, host, port, limit, err := parseHistoryQuery(r.URL.Query())
	if err != nil {
		writeJSON(w, http.StatusBadRequest, apiError{Error: err.Error()})
		return
	}
	format := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("format")))
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "csv" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "format must be json or csv"})
		return
	}
	destination := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("destination")))
	if destination == "" {
		destination = "download"
	}
	if destination != "download" && destination != "s3" {
		writeJSON(w, http.StatusBadRequest, apiError{Error: "destination must be download or s3"})
		return
	}

	points, err := appStore.QueryHistory(reqType, host, port, limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
		return
	}

	if destination == "s3" {
		if appObjectStore == nil {
			writeJSON(w, http.StatusServiceUnavailable, apiError{Error: "object storage not configured"})
			return
		}
		key := buildExportObjectKey(reqType, host, port, format)
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var objectKey string
		if format == "csv" {
			objectKey, err = appObjectStore.UploadCSV(ctx, key, historyCSVRows(points))
		} else {
			objectKey, err = appObjectStore.UploadJSON(ctx, key, points)
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
		presignedURL, err := appObjectStore.PresignedGetURL(ctx, objectKey, 15*time.Minute)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":     true,
			"key":    objectKey,
			"url":    presignedURL,
			"format": format,
			"count":  len(points),
		})
		return
	}

	filename := exportFileName(reqType, host, port, format)
	switch format {
	case "csv":
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
		cw := csv.NewWriter(w)
		if err := cw.WriteAll(historyCSVRows(points)); err != nil {
			writeJSON(w, http.StatusInternalServerError, apiError{Error: err.Error()})
			return
		}
	default:
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		_ = enc.Encode(points)
	}
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "WebSocket upgrade error: %v\n", err)
		return
	}
	defer conn.Close()

	session := &wsSession{writer: &wsWriter{conn: conn}}
	defer session.close()

	conn.SetReadLimit(maxWSMessageBytes)
	conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(wsReadTimeout))
	})

	for {
		var req wsRequest
		if err := conn.ReadJSON(&req); err != nil {
			// Check if it's a normal close or an error
			if !websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				return // Normal close
			}
			fmt.Fprintf(os.Stderr, "WebSocket read error: %v\n", err)
			return // Abnormal close or error
		}
		req.Type = strings.ToLower(strings.TrimSpace(req.Type))
		if req.Type == "" {
			_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "type is required"})
			continue
		}

		conn.SetReadDeadline(time.Now().Add(wsReadTimeout))

		switch req.Type {
		case "stop":
			if !session.stop() {
				_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "no active run"})
			}
		case "ping":
			if !session.start(req) {
				_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "a run is already in progress"})
			}
		case "tcpping":
			if !session.start(req) {
				_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "a run is already in progress"})
			}
		case "portscan":
			if !session.start(req) {
				_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "a run is already in progress"})
			}
		default:
			_ = session.writer.WriteEvent(wsEvent{Type: "error", Error: "unknown type"})
		}
	}
}

func runWSRequest(ctx context.Context, writer *wsWriter, req wsRequest) error {
	switch req.Type {
	case "ping":
		return streamPingWS(ctx, writer, req)
	case "tcpping":
		return streamTCPPingWS(ctx, writer, req)
	case "portscan":
		return streamPortScanWS(ctx, writer, req)
	default:
		return fmt.Errorf("unknown type")
	}
}

func streamPingWS(ctx context.Context, writer *wsWriter, req wsRequest) error {
	release, ok := tryAcquireProbeSlot()
	if !ok {
		return writer.WriteEvent(wsEvent{Type: "error", Error: "server busy, try again"})
	}
	defer release()

	interval := time.Second
	if req.IntervalMs > 0 {
		interval = time.Duration(req.IntervalMs) * time.Millisecond
	}
	timeout := 2 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}
	size := req.Size
	var err error
	req.Host, err = normalizeHost(req.Host)
	if err != nil {
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}
	cfg, err := normalizePingConfig(req.Count, interval, timeout, size, req.IPv6)
	if err != nil {
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	rep, err := ping.RunStreamContext(ctx, req.Host, cfg, func(res report.Result) error {
		ts := time.Now()
		storeResult("ping", req.Host, res.Addr, 0, res, ts)
		jr := toJSONResult(res)
		return writer.WriteEvent(wsEvent{
			Type:     "result",
			Protocol: "icmp",
			Target:   req.Host,
			Ts:       ts.UnixMilli(),
			Result:   &jr,
		})
	})
	if err != nil {
		if errors.Is(err, context.Canceled) {
			summary := toJSONSummary(rep.Summary)
			return writer.WriteEvent(wsEvent{
				Type:     "stopped",
				Protocol: "icmp",
				Target:   req.Host,
				Addr:     rep.Addr,
				Summary:  &summary,
			})
		}
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	summary := toJSONSummary(rep.Summary)
	return writer.WriteEvent(wsEvent{
		Type:     "summary",
		Protocol: rep.Protocol,
		Target:   rep.Target,
		Addr:     rep.Addr,
		Summary:  &summary,
	})
}

func streamTCPPingWS(ctx context.Context, writer *wsWriter, req wsRequest) error {
	release, ok := tryAcquireProbeSlot()
	if !ok {
		return writer.WriteEvent(wsEvent{Type: "error", Error: "server busy, try again"})
	}
	defer release()

	host := req.Host
	port := req.Port
	if parsedHost, parsedPort, ok := splitHostPort(host); ok {
		host = parsedHost
		if port == 0 {
			port = parsedPort
		}
	}
	if port == 0 {
		port = 80
	}

	interval := time.Second
	if req.IntervalMs > 0 {
		interval = time.Duration(req.IntervalMs) * time.Millisecond
	}
	timeout := 2 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	host, port, cfg, err := normalizeTCPPingRequest(host, port, req.Count, interval, timeout)
	if err != nil {
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	rep, err := tcpping.RunStreamContext(ctx, host, port, cfg, func(res report.Result) error {
		ts := time.Now()
		storeResult("tcpping", host, res.Addr, port, res, ts)
		jr := toJSONResult(res)
		return writer.WriteEvent(wsEvent{
			Type:     "result",
			Protocol: "tcp",
			Target:   host,
			Port:     port,
			Ts:       ts.UnixMilli(),
			Result:   &jr,
		})
	})
	if err != nil {
		if errors.Is(err, context.Canceled) {
			summary := toJSONSummary(rep.Summary)
			return writer.WriteEvent(wsEvent{
				Type:     "stopped",
				Protocol: "tcp",
				Target:   host,
				Addr:     rep.Addr,
				Port:     port,
				Summary:  &summary,
			})
		}
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	summary := toJSONSummary(rep.Summary)
	return writer.WriteEvent(wsEvent{
		Type:     "summary",
		Protocol: rep.Protocol,
		Target:   rep.Target,
		Addr:     rep.Addr,
		Port:     rep.Port,
		Summary:  &summary,
	})
}

func streamPortScanWS(ctx context.Context, writer *wsWriter, req wsRequest) error {
	release, ok := tryAcquireProbeSlot()
	if !ok {
		return writer.WriteEvent(wsEvent{Type: "error", Error: "server busy, try again"})
	}
	defer release()

	timeout := defaultProbeTimeout
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	host, _, cfg, err := normalizePortScanRequest(req.Host, req.Ports, timeout, req.Concurrency)
	if err != nil {
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	rep, err := portscan.RunStreamContext(ctx, host, cfg, func(res portscan.Result) error {
		ts := time.Now()
		jr := toJSONPortScanResult(res)
		return writer.WriteEvent(wsEvent{
			Type:     "result",
			Protocol: "tcp-portscan",
			Target:   host,
			Ts:       ts.UnixMilli(),
			Result:   &jr,
		})
	})
	if err != nil {
		if errors.Is(err, context.Canceled) {
			summary := toJSONPortScanSummary(rep.Summary)
			return writer.WriteEvent(wsEvent{
				Type:     "stopped",
				Protocol: rep.Protocol,
				Target:   rep.Target,
				Addr:     rep.Addr,
				Summary:  &summary,
			})
		}
		return writer.WriteEvent(wsEvent{Type: "error", Error: err.Error()})
	}

	summary := toJSONPortScanSummary(rep.Summary)
	return writer.WriteEvent(wsEvent{
		Type:     "summary",
		Protocol: rep.Protocol,
		Target:   rep.Target,
		Addr:     rep.Addr,
		Summary:  &summary,
	})
}

func tryAcquireProbeSlot() (func(), bool) {
	select {
	case probeLimiter <- struct{}{}:
		return func() { <-probeLimiter }, true
	default:
		rejected := rejectedProbeRequests.Add(1)
		if rejected == 1 || rejected%100 == 0 {
			fmt.Fprintf(os.Stderr, "probe limiter rejected %d request(s)\n", rejected)
		}
		return nil, false
	}
}

func isAllowedRequestOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	return isAllowedWSOrigin(r, origin)
}

func isAllowedWSOrigin(r *http.Request, origin string) bool {
	if origin == "" {
		return true
	}

	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Host == "" {
		return false
	}
	if strings.EqualFold(u.Host, r.Host) {
		return true
	}

	originHost, originPort := splitHostAndOptionalPort(u.Host)
	requestHost, requestPort := splitHostAndOptionalPort(r.Host)
	if originPort == "" {
		originPort = defaultPortForScheme(u.Scheme)
	}
	if requestPort == "" {
		requestPort = defaultPortForRequest(r)
	}

	return strings.EqualFold(originHost, requestHost) && originPort == requestPort
}

func splitHostAndOptionalPort(raw string) (string, string) {
	if raw == "" {
		return "", ""
	}
	if host, port, err := net.SplitHostPort(raw); err == nil {
		return host, port
	}
	return raw, ""
}

func defaultPortForScheme(scheme string) string {
	switch strings.ToLower(scheme) {
	case "https", "wss":
		return "443"
	case "http", "ws":
		return "80"
	default:
		return ""
	}
}

func defaultPortForRequest(r *http.Request) string {
	if r.TLS != nil {
		return "443"
	}
	return "80"
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v any) error {
	if r.Body == nil {
		return fmt.Errorf("empty body")
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
	defer r.Body.Close()

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			return fmt.Errorf("request body too large")
		}
		return err
	}
	var extra struct{}
	if err := dec.Decode(&extra); err != io.EOF {
		return fmt.Errorf("request body must contain a single JSON object")
	}
	return nil
}

func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

func toJSONReport(rep report.Report) jsonReport {
	jr := jsonReport{
		Protocol: rep.Protocol,
		Target:   rep.Target,
		Addr:     rep.Addr,
		Port:     rep.Port,
		Summary:  toJSONSummary(rep.Summary),
	}

	jr.Results = make([]jsonResult, 0, len(rep.Results))
	for _, r := range rep.Results {
		jr.Results = append(jr.Results, toJSONResult(r))
	}

	return jr
}

func toJSONPortScanReport(rep portscan.Report) jsonReport {
	jr := jsonReport{
		Protocol: rep.Protocol,
		Target:   rep.Target,
		Addr:     rep.Addr,
		Summary:  toJSONPortScanSummary(rep.Summary),
	}

	jr.Results = make([]jsonResult, 0, len(rep.Results))
	for _, r := range rep.Results {
		jr.Results = append(jr.Results, toJSONPortScanResult(r))
	}

	return jr
}

func toJSONSummary(s report.Summary) jsonSummary {
	js := jsonSummary{
		Sent: s.Sent,
		Recv: s.Recv,
		Loss: s.Loss,
	}
	if s.Recv > 0 {
		js.Min = formatDuration(s.Min)
		js.Avg = formatDuration(s.Avg)
		js.Max = formatDuration(s.Max)
		js.StdDev = formatDuration(s.StdDev)
	}
	return js
}

func toJSONPortScanSummary(s portscan.Summary) jsonSummary {
	return jsonSummary{
		Scanned:  s.Scanned,
		Open:     s.Open,
		Closed:   s.Closed,
		Timeout:  s.Timeout,
		Duration: s.Duration.Round(time.Millisecond).String(),
	}
}

func toJSONResult(r report.Result) jsonResult {
	jr := jsonResult{Seq: r.Seq}
	if r.Error != "" {
		jr.Error = r.Error
	} else {
		jr.RTT = formatDuration(r.RTT)
		ms := float64(r.RTT) / float64(time.Millisecond)
		jr.RTTMs = &ms
	}
	if r.Addr != "" {
		jr.Addr = r.Addr
	}
	return jr
}

func toJSONPortScanResult(r portscan.Result) jsonResult {
	jr := jsonResult{
		Port:  r.Port,
		State: r.State,
		Error: r.Error,
		Addr:  r.Addr,
	}
	if r.State == "open" {
		jr.RTT = formatDuration(r.RTT)
		ms := float64(r.RTT) / float64(time.Millisecond)
		jr.RTTMs = &ms
	}
	return jr
}

func storeResult(protocol, target, addr string, port int, res report.Result, ts time.Time) {
	if appStore == nil {
		return
	}
	rec := store.ResultRecord{
		Ts:       ts,
		Protocol: protocol,
		Target:   target,
		Addr:     addr,
		Port:     port,
		Seq:      res.Seq,
		Error:    res.Error,
	}
	if res.Error == "" {
		ms := float64(res.RTT) / float64(time.Millisecond)
		rec.RttMs = &ms
	}
	appStore.InsertAsync(rec)
}
