package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrAlertRuleNotFound = errors.New("alert rule not found")

type AlertRule struct {
	ID                   int64      `json:"id"`
	UserID               int64      `json:"-"`
	Name                 string     `json:"name"`
	Protocol             string     `json:"protocol"`
	Target               string     `json:"target"`
	Port                 *int       `json:"port,omitempty"`
	RecipientEmail       string     `json:"recipient_email"`
	LatencyThresholdMs   *float64   `json:"latency_threshold_ms,omitempty"`
	LossThresholdPercent *float64   `json:"loss_threshold_percent,omitempty"`
	ConsecutiveBreaches  int        `json:"consecutive_breaches"`
	CooldownMinutes      int        `json:"cooldown_minutes"`
	NotifyOnRecovery     bool       `json:"notify_on_recovery"`
	Enabled              bool       `json:"enabled"`
	LastState            string     `json:"last_state"`
	CurrentBreachStreak  int        `json:"current_breach_streak"`
	LastTriggeredAt      *time.Time `json:"last_triggered_at,omitempty"`
	LastRecoveredAt      *time.Time `json:"last_recovered_at,omitempty"`
	LastEvaluatedAt      *time.Time `json:"last_evaluated_at,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

type AlertSample struct {
	LatencyAvgMs *float64
	LossPercent  float64
	Sent         int
	Recv         int
}

type AlertDecision struct {
	Rule      AlertRule
	Triggered bool
	Recovered bool
	Severity  string
	Summary   string
}

func (s *Store) SaveAlertRule(ctx context.Context, rule AlertRule) (AlertRule, error) {
	if s == nil {
		return AlertRule{}, errors.New("store is not available")
	}

	if err := validateAlertRule(&rule); err != nil {
		return AlertRule{}, err
	}

	if rule.ID == 0 {
		var saved AlertRule
		row := s.db.QueryRowContext(ctx, `
			INSERT INTO alert_rules (
				user_id, name, protocol, target, port, recipient_email,
				latency_threshold_ms, loss_threshold_percent, consecutive_breaches,
				cooldown_minutes, notify_on_recovery, enabled
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING id, user_id, name, protocol, target, port, recipient_email,
				latency_threshold_ms, loss_threshold_percent, consecutive_breaches,
				cooldown_minutes, notify_on_recovery, enabled, last_state,
				current_breach_streak, last_triggered_at, last_recovered_at,
				last_evaluated_at, created_at
		`,
			rule.UserID,
			rule.Name,
			rule.Protocol,
			rule.Target,
			rule.Port,
			rule.RecipientEmail,
			rule.LatencyThresholdMs,
			rule.LossThresholdPercent,
			rule.ConsecutiveBreaches,
			rule.CooldownMinutes,
			rule.NotifyOnRecovery,
			rule.Enabled,
		)
		if err := scanAlertRule(row, &saved); err != nil {
			return AlertRule{}, err
		}
		return saved, nil
	}

	var saved AlertRule
	row := s.db.QueryRowContext(ctx, `
		UPDATE alert_rules
		SET
			name = $3,
			protocol = $4,
			target = $5,
			port = $6,
			recipient_email = $7,
			latency_threshold_ms = $8,
			loss_threshold_percent = $9,
			consecutive_breaches = $10,
			cooldown_minutes = $11,
			notify_on_recovery = $12,
			enabled = $13
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, protocol, target, port, recipient_email,
			latency_threshold_ms, loss_threshold_percent, consecutive_breaches,
			cooldown_minutes, notify_on_recovery, enabled, last_state,
			current_breach_streak, last_triggered_at, last_recovered_at,
			last_evaluated_at, created_at
	`,
		rule.ID,
		rule.UserID,
		rule.Name,
		rule.Protocol,
		rule.Target,
		rule.Port,
		rule.RecipientEmail,
		rule.LatencyThresholdMs,
		rule.LossThresholdPercent,
		rule.ConsecutiveBreaches,
		rule.CooldownMinutes,
		rule.NotifyOnRecovery,
		rule.Enabled,
	)
	err := scanAlertRule(row, &saved)
	if errors.Is(err, sql.ErrNoRows) {
		return AlertRule{}, ErrAlertRuleNotFound
	}
	if err != nil {
		return AlertRule{}, err
	}
	return saved, nil
}

func (s *Store) ListAlertRules(ctx context.Context, userID int64) ([]AlertRule, error) {
	if s == nil {
		return nil, errors.New("store is not available")
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, user_id, name, protocol, target, port, recipient_email,
			latency_threshold_ms, loss_threshold_percent, consecutive_breaches,
			cooldown_minutes, notify_on_recovery, enabled, last_state,
			current_breach_streak, last_triggered_at, last_recovered_at,
			last_evaluated_at, created_at
		FROM alert_rules
		WHERE user_id = $1
		ORDER BY created_at DESC, id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := make([]AlertRule, 0, 8)
	for rows.Next() {
		var rule AlertRule
		if err := scanAlertRule(rows, &rule); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (s *Store) DeleteAlertRule(ctx context.Context, userID, ruleID int64) error {
	if s == nil {
		return errors.New("store is not available")
	}
	res, err := s.db.ExecContext(ctx, `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2`, ruleID, userID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrAlertRuleNotFound
	}
	return nil
}

func (s *Store) EvaluateAlertRules(ctx context.Context, userID int64, protocol, target string, port int, sample AlertSample) ([]AlertDecision, error) {
	if s == nil {
		return nil, errors.New("store is not available")
	}

	now := time.Now().UTC()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	rows, err := tx.QueryContext(ctx, `
		SELECT id, user_id, name, protocol, target, port, recipient_email,
			latency_threshold_ms, loss_threshold_percent, consecutive_breaches,
			cooldown_minutes, notify_on_recovery, enabled, last_state,
			current_breach_streak, last_triggered_at, last_recovered_at,
			last_evaluated_at, created_at
		FROM alert_rules
		WHERE user_id = $1
			AND enabled = TRUE
			AND protocol = $2
			AND target = $3
			AND (
				($4 = 0 AND port IS NULL) OR port = $4
			)
		ORDER BY id
		FOR UPDATE
	`, userID, protocol, target, port)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := make([]AlertRule, 0, 4)
	for rows.Next() {
		var rule AlertRule
		if err := scanAlertRule(rows, &rule); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	decisions := make([]AlertDecision, 0, len(rules))
	for _, rule := range rules {

		breach, severity, summary := evaluateAlertThresholds(rule, sample)
		nextState := "healthy"
		nextStreak := 0
		var nextTriggeredAt *time.Time
		var nextRecoveredAt *time.Time
		if rule.LastTriggeredAt != nil {
			t := rule.LastTriggeredAt.UTC()
			nextTriggeredAt = &t
		}
		if rule.LastRecoveredAt != nil {
			t := rule.LastRecoveredAt.UTC()
			nextRecoveredAt = &t
		}

		decision := AlertDecision{
			Rule:     rule,
			Severity: severity,
			Summary:  summary,
		}

		if breach {
			nextState = "alert"
			nextStreak = rule.CurrentBreachStreak + 1
			requiredStreak := rule.ConsecutiveBreaches
			if requiredStreak <= 0 {
				requiredStreak = 1
			}
			cooldownElapsed := rule.LastTriggeredAt == nil || now.Sub(rule.LastTriggeredAt.UTC()) >= time.Duration(rule.CooldownMinutes)*time.Minute
			if nextStreak >= requiredStreak && (rule.LastState != "alert" || cooldownElapsed) {
				decision.Triggered = true
				decision.Rule.CurrentBreachStreak = nextStreak
				decision.Rule.LastState = nextState
				nextTriggeredAt = &now
			}
		} else if rule.LastState == "alert" && rule.NotifyOnRecovery {
			decision.Recovered = true
			decision.Severity = "success"
			decision.Summary = fmt.Sprintf("Rule recovered for %s. Latest run is back within threshold.", rule.Target)
			nextRecoveredAt = &now
		}

		if breach {
			nextState = "alert"
		}

		if _, err := tx.ExecContext(ctx, `
			UPDATE alert_rules
			SET last_state = $2,
				current_breach_streak = $3,
				last_triggered_at = $4,
				last_recovered_at = $5,
				last_evaluated_at = $6
			WHERE id = $1
		`, rule.ID, nextState, nextStreak, nextTriggeredAt, nextRecoveredAt, now); err != nil {
			return nil, err
		}

		if decision.Triggered || decision.Recovered {
			decision.Rule.LastState = nextState
			decision.Rule.CurrentBreachStreak = nextStreak
			decision.Rule.LastTriggeredAt = nextTriggeredAt
			decision.Rule.LastRecoveredAt = nextRecoveredAt
			decision.Rule.LastEvaluatedAt = &now
			decisions = append(decisions, decision)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return decisions, nil
}

func validateAlertRule(rule *AlertRule) error {
	rule.Protocol = strings.ToLower(strings.TrimSpace(rule.Protocol))
	switch rule.Protocol {
	case "ping", "tcpping":
	default:
		return errors.New("protocol must be ping or tcpping")
	}
	rule.Target = strings.TrimSpace(rule.Target)
	if rule.Target == "" {
		return errors.New("target is required")
	}
	if rule.UserID <= 0 {
		return errors.New("user is required")
	}
	email, err := NormalizeEmail(rule.RecipientEmail)
	if err != nil {
		return err
	}
	rule.RecipientEmail = email
	rule.Name = strings.TrimSpace(rule.Name)
	if rule.Name == "" {
		rule.Name = defaultAlertRuleName(*rule)
	}
	if rule.LatencyThresholdMs != nil && *rule.LatencyThresholdMs <= 0 {
		return errors.New("latency threshold must be greater than zero")
	}
	if rule.LossThresholdPercent != nil {
		if *rule.LossThresholdPercent < 0 || *rule.LossThresholdPercent > 100 {
			return errors.New("loss threshold must be between 0 and 100")
		}
	}
	if rule.LatencyThresholdMs == nil && rule.LossThresholdPercent == nil {
		return errors.New("at least one threshold is required")
	}
	if rule.Protocol == "ping" {
		rule.Port = nil
	} else {
		if rule.Port == nil || *rule.Port < 1 || *rule.Port > 65535 {
			return errors.New("port must be between 1 and 65535")
		}
	}
	if rule.ConsecutiveBreaches <= 0 {
		rule.ConsecutiveBreaches = 1
	}
	if rule.CooldownMinutes <= 0 {
		rule.CooldownMinutes = 30
	}
	return nil
}

func defaultAlertRuleName(rule AlertRule) string {
	if rule.Protocol == "tcpping" && rule.Port != nil {
		return fmt.Sprintf("%s %s:%d", strings.ToUpper(rule.Protocol), rule.Target, *rule.Port)
	}
	return fmt.Sprintf("%s %s", strings.ToUpper(rule.Protocol), rule.Target)
}

func evaluateAlertThresholds(rule AlertRule, sample AlertSample) (bool, string, string) {
	reasons := make([]string, 0, 2)
	severity := "warning"
	if rule.LatencyThresholdMs != nil && sample.LatencyAvgMs != nil && *sample.LatencyAvgMs >= *rule.LatencyThresholdMs {
		reasons = append(reasons, fmt.Sprintf("Average latency %.1fms exceeded %.1fms", *sample.LatencyAvgMs, *rule.LatencyThresholdMs))
	}
	if rule.LossThresholdPercent != nil && sample.LossPercent >= *rule.LossThresholdPercent {
		reasons = append(reasons, fmt.Sprintf("Packet loss %.1f%% exceeded %.1f%%", sample.LossPercent, *rule.LossThresholdPercent))
		if sample.LossPercent >= 100 {
			severity = "critical"
		}
	}
	if len(reasons) == 0 {
		return false, "success", ""
	}
	if severity != "critical" && sample.LatencyAvgMs != nil && *sample.LatencyAvgMs >= 1000 {
		severity = "critical"
	}
	return true, severity, strings.Join(reasons, ". ")
}

type alertRuleScanner interface {
	Scan(dest ...any) error
}

func scanAlertRule(scanner alertRuleScanner, rule *AlertRule) error {
	var port sql.NullInt64
	var latency sql.NullFloat64
	var loss sql.NullFloat64
	var lastTriggered sql.NullTime
	var lastRecovered sql.NullTime
	var lastEvaluated sql.NullTime

	if err := scanner.Scan(
		&rule.ID,
		&rule.UserID,
		&rule.Name,
		&rule.Protocol,
		&rule.Target,
		&port,
		&rule.RecipientEmail,
		&latency,
		&loss,
		&rule.ConsecutiveBreaches,
		&rule.CooldownMinutes,
		&rule.NotifyOnRecovery,
		&rule.Enabled,
		&rule.LastState,
		&rule.CurrentBreachStreak,
		&lastTriggered,
		&lastRecovered,
		&lastEvaluated,
		&rule.CreatedAt,
	); err != nil {
		return err
	}
	if port.Valid {
		v := int(port.Int64)
		rule.Port = &v
	} else {
		rule.Port = nil
	}
	if latency.Valid {
		v := latency.Float64
		rule.LatencyThresholdMs = &v
	} else {
		rule.LatencyThresholdMs = nil
	}
	if loss.Valid {
		v := loss.Float64
		rule.LossThresholdPercent = &v
	} else {
		rule.LossThresholdPercent = nil
	}
	rule.LastTriggeredAt = nullTimePtr(lastTriggered)
	rule.LastRecoveredAt = nullTimePtr(lastRecovered)
	rule.LastEvaluatedAt = nullTimePtr(lastEvaluated)
	return nil
}

func nullTimePtr(v sql.NullTime) *time.Time {
	if !v.Valid {
		return nil
	}
	t := v.Time.UTC()
	return &t
}

