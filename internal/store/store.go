package store

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

const (
	DriverSQLite   = "sqlite"
	DriverPostgres = "postgres"
)

type Config struct {
	Driver           string
	Path             string
	DSN              string
	BatchSize        int
	FlushInterval    time.Duration
	Retention        time.Duration
	CleanupInterval  time.Duration
	MaxOpenConns     int
	MaxIdleConns     int
	ConnMaxLifetime  time.Duration
	RequireTimescale bool
}

type Store struct {
	db        *sql.DB
	driver    string
	insertCh  chan ResultRecord
	done      chan struct{}
	cfg       Config
	wg        sync.WaitGroup
	closeOnce sync.Once
	dropped   atomic.Uint64
	errors    atomic.Uint64
}

type ResultRecord struct {
	Ts       time.Time
	Protocol string
	Target   string
	Addr     string
	Port     int
	Seq      int
	RttMs    *float64
	Error    string
}

type HistoryPoint struct {
	Ts    int64    `json:"ts"`
	Seq   int      `json:"seq,omitempty"`
	RttMs *float64 `json:"rtt_ms,omitempty"`
	Error string   `json:"error,omitempty"`
}

func Open(path string) (*Store, error) {
	return OpenWithConfig(path, Config{})
}

func OpenWithConfig(path string, cfg Config) (*Store, error) {
	if cfg.Path == "" {
		cfg.Path = path
	}
	if cfg.Driver == "" {
		cfg.Driver = DriverSQLite
	}
	return OpenConfigured(cfg)
}

func OpenConfigured(cfg Config) (*Store, error) {
	cfg = applyDefaults(cfg)

	driver := normalizeDriver(cfg.Driver)
	if driver == "" {
		return nil, fmt.Errorf("unsupported db driver: %q", cfg.Driver)
	}

	db, err := openDB(driver, cfg)
	if err != nil {
		return nil, err
	}

	if err := setupSchema(db, driver, cfg); err != nil {
		_ = db.Close()
		return nil, err
	}

	chSize := cfg.BatchSize * 4
	if chSize < 512 {
		chSize = 512
	}

	s := &Store{
		db:       db,
		driver:   driver,
		insertCh: make(chan ResultRecord, chSize),
		done:     make(chan struct{}),
		cfg:      cfg,
	}
	s.wg.Add(1)
	go s.worker()

	return s, nil
}

func (s *Store) Close() error {
	if s == nil {
		return nil
	}
	var err error
	s.closeOnce.Do(func() {
		close(s.done)
		s.wg.Wait()
		err = s.db.Close()
	})
	return err
}

func (s *Store) Driver() string {
	if s == nil {
		return ""
	}
	return s.driver
}

func (s *Store) Ping(ctx context.Context) error {
	if s == nil {
		return nil
	}
	return s.db.PingContext(ctx)
}

func (s *Store) InsertAsync(rec ResultRecord) {
	if s == nil {
		return
	}
	select {
	case s.insertCh <- rec:
	case <-s.done:
	default:
		dropped := s.dropped.Add(1)
		if dropped == 1 || dropped%100 == 0 {
			log.Printf("store queue full, dropped %d result(s)", dropped)
		}
	}
}

func (s *Store) worker() {
	defer s.wg.Done()

	flushTicker := time.NewTicker(s.cfg.FlushInterval)
	defer flushTicker.Stop()

	var cleanupTicker *time.Ticker
	var cleanupCh <-chan time.Time
	if s.cfg.Retention > 0 {
		cleanupTicker = time.NewTicker(s.cfg.CleanupInterval)
		cleanupCh = cleanupTicker.C
		defer cleanupTicker.Stop()
	}

	batch := make([]ResultRecord, 0, s.cfg.BatchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := s.insertBatch(batch); err != nil {
			errors := s.errors.Add(1)
			log.Printf("store batch insert failed (%d): %v", errors, err)
		}
		batch = batch[:0]
	}

	cleanup := func() {
		if s.cfg.Retention <= 0 {
			return
		}
		cutoff := time.Now().Add(-s.cfg.Retention)
		if err := s.deleteOlderThan(cutoff); err != nil {
			errors := s.errors.Add(1)
			log.Printf("store cleanup failed (%d): %v", errors, err)
		}
	}

	for {
		select {
		case rec := <-s.insertCh:
			batch = append(batch, rec)
			if len(batch) >= s.cfg.BatchSize {
				flush()
			}
		case <-flushTicker.C:
			flush()
		case <-s.done:
			for {
				select {
				case rec := <-s.insertCh:
					batch = append(batch, rec)
				default:
					flush()
					return
				}
			}
		case <-cleanupCh:
			cleanup()
		}
	}
}

func (s *Store) insertBatch(batch []ResultRecord) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare(s.insertStatement())
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	for _, rec := range batch {
		args := []any{
			s.normalizeTimestamp(rec.Ts),
			rec.Protocol,
			rec.Target,
			rec.Addr,
			rec.Port,
			rec.Seq,
			rec.RttMs,
			rec.Error,
		}
		if _, err := stmt.Exec(args...); err != nil {
			_ = stmt.Close()
			_ = tx.Rollback()
			return err
		}
	}

	_ = stmt.Close()
	return tx.Commit()
}

func (s *Store) QueryHistory(protocol, target string, port int, limit int) ([]HistoryPoint, error) {
	if s == nil {
		return nil, nil
	}
	if limit <= 0 {
		limit = 120
	}
	if limit > 1000 {
		limit = 1000
	}

	args := []any{protocol, target}
	query := s.queryHistorySQL(port > 0)
	if port > 0 {
		args = append(args, port)
	}
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := make([]HistoryPoint, 0, limit)
	for rows.Next() {
		var ts int64
		var seq sql.NullInt64
		var rtt sql.NullFloat64
		var errStr sql.NullString
		if err := rows.Scan(&ts, &seq, &rtt, &errStr); err != nil {
			return nil, err
		}

		p := HistoryPoint{Ts: ts}
		if seq.Valid {
			p.Seq = int(seq.Int64)
		}
		if rtt.Valid {
			v := rtt.Float64
			p.RttMs = &v
		}
		if errStr.Valid {
			p.Error = errStr.String
		}
		points = append(points, p)
	}

	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}

	return points, rows.Err()
}

func (s *Store) deleteOlderThan(cutoff time.Time) error {
	query := "DELETE FROM results WHERE ts < ?"
	args := []any{cutoff.UnixMilli()}
	if s.driver == DriverPostgres {
		query = "DELETE FROM results WHERE ts < $1"
		args = []any{cutoff.UTC()}
	}
	_, err := s.db.Exec(query, args...)
	return err
}

func (s *Store) insertStatement() string {
	switch s.driver {
	case DriverPostgres:
		return `INSERT INTO results (ts, protocol, target, addr, port, seq, rtt_ms, error)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`
	default:
		return `INSERT INTO results (ts, protocol, target, addr, port, seq, rtt_ms, error)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
	}
}

func (s *Store) queryHistorySQL(withPort bool) string {
	switch s.driver {
	case DriverPostgres:
		query := `SELECT CAST(EXTRACT(EPOCH FROM ts) * 1000 AS BIGINT), seq, rtt_ms, error FROM results
			WHERE protocol = $1 AND target = $2`
		if withPort {
			query += " AND port = $3"
			query += " ORDER BY ts DESC LIMIT $4"
		} else {
			query += " ORDER BY ts DESC LIMIT $3"
		}
		return query
	default:
		query := `SELECT ts, seq, rtt_ms, error FROM results
			WHERE protocol = ? AND target = ?`
		if withPort {
			query += " AND port = ?"
		}
		query += " ORDER BY ts DESC LIMIT ?"
		return query
	}
}

func (s *Store) normalizeTimestamp(ts time.Time) any {
	if s.driver == DriverPostgres {
		return ts.UTC()
	}
	return ts.UnixMilli()
}

func openDB(driver string, cfg Config) (*sql.DB, error) {
	switch driver {
	case DriverSQLite:
		if strings.TrimSpace(cfg.Path) == "" {
			return nil, fmt.Errorf("sqlite path is required")
		}
		db, err := sql.Open("sqlite", cfg.Path)
		if err != nil {
			return nil, err
		}
		return db, nil
	case DriverPostgres:
		if strings.TrimSpace(cfg.DSN) == "" {
			return nil, fmt.Errorf("postgres dsn is required")
		}
		db, err := sql.Open("pgx", cfg.DSN)
		if err != nil {
			return nil, err
		}
		if cfg.MaxOpenConns > 0 {
			db.SetMaxOpenConns(cfg.MaxOpenConns)
		}
		if cfg.MaxIdleConns > 0 {
			db.SetMaxIdleConns(cfg.MaxIdleConns)
		}
		if cfg.ConnMaxLifetime > 0 {
			db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
		}
		return db, nil
	default:
		return nil, fmt.Errorf("unsupported db driver: %q", driver)
	}
}

func setupSchema(db *sql.DB, driver string, cfg Config) error {
	switch driver {
	case DriverSQLite:
		if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
			return err
		}
		if _, err := db.Exec("PRAGMA synchronous=NORMAL;"); err != nil {
			return err
		}
		if _, err := db.Exec(`
			CREATE TABLE IF NOT EXISTS results (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				ts INTEGER NOT NULL,
				protocol TEXT NOT NULL,
				target TEXT NOT NULL,
				addr TEXT,
				port INTEGER,
				seq INTEGER,
				rtt_ms REAL,
				error TEXT
			);
		`); err != nil {
			return err
		}
		if _, err := db.Exec(`
			CREATE INDEX IF NOT EXISTS idx_results_lookup
			ON results(protocol, target, port, ts);
		`); err != nil {
			return err
		}
		return nil
	case DriverPostgres:
		if err := db.Ping(); err != nil {
			return err
		}
		if cfg.RequireTimescale {
			if _, err := db.Exec(`CREATE EXTENSION IF NOT EXISTS timescaledb;`); err != nil {
				return fmt.Errorf("enable timescaledb extension: %w", err)
			}
		}
		if _, err := db.Exec(`
			CREATE TABLE IF NOT EXISTS results (
				id BIGINT GENERATED BY DEFAULT AS IDENTITY,
				ts TIMESTAMPTZ NOT NULL,
				protocol TEXT NOT NULL,
				target TEXT NOT NULL,
				addr TEXT,
				port INTEGER,
				seq INTEGER,
				rtt_ms DOUBLE PRECISION,
				error TEXT,
				PRIMARY KEY (ts, id)
			);
		`); err != nil {
			return err
		}
		if _, err := db.Exec(`
			CREATE INDEX IF NOT EXISTS idx_results_lookup
			ON results(protocol, target, port, ts DESC);
		`); err != nil {
			return err
		}
		if cfg.RequireTimescale {
			if _, err := db.Exec(`
				SELECT create_hypertable('results', 'ts', if_not_exists => TRUE, migrate_data => TRUE);
			`); err != nil {
				return fmt.Errorf("create timescaledb hypertable: %w", err)
			}
		}
		return nil
	default:
		return fmt.Errorf("unsupported db driver: %q", driver)
	}
}

func applyDefaults(cfg Config) Config {
	cfg.Driver = normalizeDriver(cfg.Driver)
	if cfg.Driver == "" {
		cfg.Driver = DriverSQLite
	}
	if cfg.BatchSize <= 0 {
		cfg.BatchSize = 100
	}
	if cfg.FlushInterval <= 0 {
		cfg.FlushInterval = 1 * time.Second
	}
	if cfg.CleanupInterval <= 0 {
		cfg.CleanupInterval = 1 * time.Hour
	}
	if cfg.MaxOpenConns <= 0 {
		cfg.MaxOpenConns = 10
	}
	if cfg.MaxIdleConns <= 0 {
		cfg.MaxIdleConns = 5
	}
	if cfg.ConnMaxLifetime <= 0 {
		cfg.ConnMaxLifetime = 30 * time.Minute
	}
	return cfg
}

func normalizeDriver(driver string) string {
	switch strings.ToLower(strings.TrimSpace(driver)) {
	case "", DriverSQLite:
		return DriverSQLite
	case "postgres", "postgresql", "timescaledb":
		return DriverPostgres
	default:
		return ""
	}
}
