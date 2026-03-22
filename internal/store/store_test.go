package store

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

func TestStoreInsertAndQueryHistoryOrder(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})
	const userID int64 = 101

	olderTs := time.Now().Add(-time.Minute)
	newerTs := time.Now()
	st.InsertAsync(ResultRecord{
		UserID:   userID,
		Ts:       olderTs,
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(10),
	})
	st.InsertAsync(ResultRecord{
		UserID:   userID,
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
		points, err = st.QueryHistory(userID, "ping", "example.com", 0, 10)
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
		Retention:       500 * time.Millisecond,
		CleanupInterval: 25 * time.Millisecond,
	})
	const userID int64 = 202

	st.InsertAsync(ResultRecord{
		UserID:   userID,
		Ts:       time.Now().Add(-time.Hour),
		Protocol: "ping",
		Target:   "cleanup.test",
		Seq:      1,
		RttMs:    float64Ptr(5),
	})
	st.InsertAsync(ResultRecord{
		UserID:   userID,
		Ts:       time.Now(),
		Protocol: "ping",
		Target:   "cleanup.test",
		Seq:      2,
		RttMs:    float64Ptr(8),
	})

	waitFor(t, 400*time.Millisecond, func() bool {
		points, err := st.QueryHistory(userID, "ping", "cleanup.test", 0, 10)
		return err == nil && len(points) == 1 && points[0].Seq == 2
	})
}

func openTestStore(t *testing.T, cfg Config) *Store {
	t.Helper()

	dsn := strings.TrimSpace(os.Getenv("NETWATCHER_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("NETWATCHER_TEST_POSTGRES_DSN is not set")
	}

	cfg.DSN = dsn
	cfg.TableName = testTableName(t.Name())
	st, err := OpenConfigured(cfg)
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

func testTableName(name string) string {
	name = strings.ToLower(name)
	var b strings.Builder
	b.WriteString("test_")
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			continue
		}
		b.WriteByte('_')
	}
	b.WriteString("_")
	b.WriteString(fmt.Sprintf("%d", time.Now().UnixNano()))
	return b.String()
}
