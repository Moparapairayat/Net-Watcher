package mailer

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestSendPasswordResetBuildsResendRequest(t *testing.T) {
	var gotAuth string
	var gotPayload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"email_123"}`))
	}))
	defer srv.Close()

	client, err := Open(Config{
		APIKey:   "test-key",
		From:     "NetWatcher <alerts@example.com>",
		ReplyTo:  "support@example.com",
		Endpoint: srv.URL,
		Timeout:  5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}

	err = client.SendPasswordReset(context.Background(), PasswordResetInput{
		To:        "user@example.com",
		Name:      "Test User",
		ResetURL:  "https://example.com/reset-password?token=abc",
		ExpiresIn: 30 * time.Minute,
	})
	if err != nil {
		t.Fatalf("SendPasswordReset returned error: %v", err)
	}

	if gotAuth != "Bearer test-key" {
		t.Fatalf("expected bearer auth, got %q", gotAuth)
	}
	if gotPayload["subject"] != "[NetWatcher] Reset Password Request" {
		t.Fatalf("unexpected subject: %#v", gotPayload["subject"])
	}
	if gotPayload["from"] != "NetWatcher <alerts@example.com>" {
		t.Fatalf("unexpected from: %#v", gotPayload["from"])
	}
	html, _ := gotPayload["html"].(string)
	if !strings.Contains(html, "NetWatcher") || !strings.Contains(html, "Reset Password") || !strings.Contains(html, "Credential Recovery") || !strings.Contains(html, "support@example.com") {
		t.Fatalf("expected branded reset email html, got %q", html)
	}
}

func TestSendVerificationOTPBuildsResendRequest(t *testing.T) {
	var gotPayload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"email_otp"}`))
	}))
	defer srv.Close()

	client, err := Open(Config{
		APIKey:   "test-key",
		From:     "NetWatcher <alerts@example.com>",
		Endpoint: srv.URL,
		Timeout:  5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}

	if err := client.SendVerificationOTP(context.Background(), VerificationOTPInput{
		To:        "user@example.com",
		Name:      "Test User",
		Code:      "123456",
		ExpiresIn: 10 * time.Minute,
	}); err != nil {
		t.Fatalf("SendVerificationOTP returned error: %v", err)
	}

	if gotPayload["subject"] != "[NetWatcher] Verify Your Email" {
		t.Fatalf("unexpected subject: %#v", gotPayload["subject"])
	}
	html, _ := gotPayload["html"].(string)
	if !strings.Contains(html, "NetWatcher") || !strings.Contains(html, "123456") || !strings.Contains(html, "Email Verification") {
		t.Fatalf("expected branded verification email html, got %q", html)
	}
}

func TestSendWelcomeBuildsResendRequest(t *testing.T) {
	var gotPayload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"email_welcome"}`))
	}))
	defer srv.Close()

	client, err := Open(Config{
		APIKey:   "test-key",
		From:     "NetWatcher <alerts@example.com>",
		ReplyTo:  "support@example.com",
		Endpoint: srv.URL,
		Timeout:  5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}

	if err := client.SendWelcome(context.Background(), WelcomeEmailInput{
		To:           "user@example.com",
		Name:         "Test User",
		DashboardURL: "https://example.com",
	}); err != nil {
		t.Fatalf("SendWelcome returned error: %v", err)
	}

	if gotPayload["subject"] != "[NetWatcher] Access Activated" {
		t.Fatalf("unexpected subject: %#v", gotPayload["subject"])
	}
	html, _ := gotPayload["html"].(string)
	if !strings.Contains(html, "Welcome to NetWatcher") || !strings.Contains(html, "Open Dashboard") || !strings.Contains(html, "Recommended First Steps") {
		t.Fatalf("expected branded welcome email html, got %q", html)
	}
}

func TestSendAlertBuildsResendRequest(t *testing.T) {
	var gotPayload map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"email_alert"}`))
	}))
	defer srv.Close()

	client, err := Open(Config{
		APIKey:   "test-key",
		From:     "NetWatcher <alerts@example.com>",
		ReplyTo:  "support@example.com",
		Endpoint: srv.URL,
		Timeout:  5 * time.Second,
	})
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}

	if err := client.SendAlert(context.Background(), AlertEmailInput{
		To:           "user@example.com",
		Name:         "Test User",
		Severity:     "critical",
		Title:        "Host Down",
		Summary:      "The primary target is unreachable.",
		Target:       "api.example.com",
		TriggeredAt:  time.Date(2026, 3, 21, 7, 0, 0, 0, time.UTC),
		DashboardURL: "https://example.com/alerts/1",
	}); err != nil {
		t.Fatalf("SendAlert returned error: %v", err)
	}

	if gotPayload["subject"] != "[NetWatcher] Critical Alert" {
		t.Fatalf("unexpected subject: %#v", gotPayload["subject"])
	}
	html, _ := gotPayload["html"].(string)
	if !strings.Contains(html, "Host Down") || !strings.Contains(html, "api.example.com") || !strings.Contains(html, "Review Alert") {
		t.Fatalf("expected branded alert email html, got %q", html)
	}
}
