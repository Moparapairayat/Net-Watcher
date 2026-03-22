package store

import (
	"context"
	"testing"
	"time"
)

func TestAlertRuleCRUDAndEvaluation(t *testing.T) {
	st := openTestStore(t, Config{
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	user, err := st.CreateUser(ctx, "Alert Tester", testEmail("alerts"), "hash-1", false)
	if err != nil {
		t.Fatalf("CreateUser returned error: %v", err)
	}

	threshold := 120.0
	rule, err := st.SaveAlertRule(ctx, AlertRule{
		UserID:              user.ID,
		Name:                "API latency",
		Protocol:            "tcpping",
		Target:              "example.com",
		Port:                intPtr(443),
		RecipientEmail:      user.Email,
		LatencyThresholdMs:  &threshold,
		ConsecutiveBreaches: 2,
		CooldownMinutes:     30,
		NotifyOnRecovery:    true,
		Enabled:             true,
	})
	if err != nil {
		t.Fatalf("SaveAlertRule returned error: %v", err)
	}

	rules, err := st.ListAlertRules(ctx, user.ID)
	if err != nil {
		t.Fatalf("ListAlertRules returned error: %v", err)
	}
	if len(rules) != 1 || rules[0].ID != rule.ID {
		t.Fatalf("unexpected rules: %#v", rules)
	}

	avg := 180.0
	decisions, err := st.EvaluateAlertRules(ctx, user.ID, "tcpping", "example.com", 443, AlertSample{
		LatencyAvgMs: &avg,
		LossPercent:  0,
		Sent:         4,
		Recv:         4,
	})
	if err != nil {
		t.Fatalf("EvaluateAlertRules first run returned error: %v", err)
	}
	if len(decisions) != 0 {
		t.Fatalf("expected no trigger on first breach, got %#v", decisions)
	}

	decisions, err = st.EvaluateAlertRules(ctx, user.ID, "tcpping", "example.com", 443, AlertSample{
		LatencyAvgMs: &avg,
		LossPercent:  0,
		Sent:         4,
		Recv:         4,
	})
	if err != nil {
		t.Fatalf("EvaluateAlertRules second run returned error: %v", err)
	}
	if len(decisions) != 1 || !decisions[0].Triggered {
		t.Fatalf("expected triggered alert on second breach, got %#v", decisions)
	}

	okAvg := 40.0
	decisions, err = st.EvaluateAlertRules(ctx, user.ID, "tcpping", "example.com", 443, AlertSample{
		LatencyAvgMs: &okAvg,
		LossPercent:  0,
		Sent:         4,
		Recv:         4,
	})
	if err != nil {
		t.Fatalf("EvaluateAlertRules recovery run returned error: %v", err)
	}
	if len(decisions) != 1 || !decisions[0].Recovered {
		t.Fatalf("expected recovery alert, got %#v", decisions)
	}

	if err := st.DeleteAlertRule(ctx, user.ID, rule.ID); err != nil {
		t.Fatalf("DeleteAlertRule returned error: %v", err)
	}
}

func testEmail(prefix string) string {
	return prefix + "_" + time.Now().Format("150405.000000000") + "@example.com"
}

func intPtr(v int) *int {
	return &v
}
