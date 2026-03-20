package store

import (
	"path/filepath"
	"testing"
	"time"
)

func TestStoreInsertAndQueryHistoryOrder(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	olderTs := time.Now().Add(-time.Minute)
	newerTs := time.Now()
	st.InsertAsync(ResultRecord{
		Ts:       olderTs,
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(10),
	})
	st.InsertAsync(ResultRecord{
		Ts:       newerTs,
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      2,
		RttMs:    float64Ptr(20),
	})

	var points []HistoryPoint
	waitFor(t, time.Second, func() bool {
		var err error
		points, err = st.QueryHistory("ping", "example.com", 0, 10)
		return err == nil && len(points) == 2
	})

	if points[0].Seq != 1 || points[1].Seq != 2 {
		t.Fatalf("expected chronological order by seq, got %d then %d", points[0].Seq, points[1].Seq)
	}
	if points[0].Ts >= points[1].Ts {
		t.Fatalf("expected ascending timestamps, got %d and %d", points[0].Ts, points[1].Ts)
	}
}

func TestStoreRetentionCleanupRemovesExpiredRows(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:       1,
		FlushInterval:   5 * time.Millisecond,
		Retention:       25 * time.Millisecond,
		CleanupInterval: 10 * time.Millisecond,
	})

	st.InsertAsync(ResultRecord{
		Ts:       time.Now().Add(-time.Hour),
		Protocol: "ping",
		Target:   "cleanup.test",
		Seq:      1,
		RttMs:    float64Ptr(5),
	})
	st.InsertAsync(ResultRecord{
		Ts:       time.Now(),
		Protocol: "ping",
		Target:   "cleanup.test",
		Seq:      2,
		RttMs:    float64Ptr(8),
	})

	waitFor(t, 2*time.Second, func() bool {
		points, err := st.QueryHistory("ping", "cleanup.test", 0, 10)
		return err == nil && len(points) == 1 && points[0].Seq == 2
	})
}

func openTestStore(t *testing.T, cfg Config) *Store {
	t.Helper()

	st, err := OpenWithConfig(filepath.Join(t.TempDir(), "test.db"), cfg)
	if err != nil {
		t.Fatalf("open store: %v", err)
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
