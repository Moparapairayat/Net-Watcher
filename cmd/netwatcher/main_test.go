package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"

	"netwatcher/internal/mailer"
	"netwatcher/internal/store"
)

func TestNormalizePingConfigDefaultsAndBounds(t *testing.T) {
	cfg, err := normalizePingConfig(0, 0, 0, 0, true)
	if err != nil {
		t.Fatalf("normalizePingConfig returned error: %v", err)
	}

	if cfg.Count != defaultProbeCount {
		t.Fatalf("expected default count %d, got %d", defaultProbeCount, cfg.Count)
	}
	if cfg.Interval != defaultProbeInterval {
		t.Fatalf("expected default interval %s, got %s", defaultProbeInterval, cfg.Interval)
	}
	if cfg.Timeout != defaultProbeTimeout {
		t.Fatalf("expected default timeout %s, got %s", defaultProbeTimeout, cfg.Timeout)
	}
	if cfg.Size != defaultPingSize {
		t.Fatalf("expected default size %d, got %d", defaultPingSize, cfg.Size)
	}
	if !cfg.ForceIPv6 {
		t.Fatal("expected ForceIPv6 to be preserved")
	}

	if _, err := normalizePingConfig(maxProbeCount+1, time.Second, time.Second, defaultPingSize, false); err == nil {
		t.Fatal("expected count validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, minProbeInterval-time.Millisecond, time.Second, defaultPingSize, false); err == nil {
		t.Fatal("expected interval validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, time.Second, minProbeTimeout-time.Millisecond, defaultPingSize, false); err == nil {
		t.Fatal("expected timeout validation error")
	}
	if _, err := normalizePingConfig(defaultProbeCount, time.Second, time.Second, minPingSize-1, false); err == nil {
		t.Fatal("expected size validation error")
	}
}

func TestNormalizeTCPPingRequestDefaultsAndBounds(t *testing.T) {
	host, port, cfg, err := normalizeTCPPingRequest("  example.com  ", 0, 0, 0, 0)
	if err != nil {
		t.Fatalf("normalizeTCPPingRequest returned error: %v", err)
	}

	if host != "example.com" {
		t.Fatalf("expected trimmed host, got %q", host)
	}
	if port != defaultTCPPort {
		t.Fatalf("expected default port %d, got %d", defaultTCPPort, port)
	}
	if cfg.Count != defaultProbeCount {
		t.Fatalf("expected default count %d, got %d", defaultProbeCount, cfg.Count)
	}

	if _, _, _, err := normalizeTCPPingRequest("", 443, 1, time.Second, time.Second); err == nil {
		t.Fatal("expected host validation error")
	}
	if _, _, _, err := normalizeTCPPingRequest("example.com", 70000, 1, time.Second, time.Second); err == nil {
		t.Fatal("expected port validation error")
	}
}

func TestNormalizePortScanRequestDefaultsAndBounds(t *testing.T) {
	host, ports, cfg, err := normalizePortScanRequest("  example.com  ", "22,80,443", 0, 0)
	if err != nil {
		t.Fatalf("normalizePortScanRequest returned error: %v", err)
	}

	if host != "example.com" {
		t.Fatalf("expected trimmed host, got %q", host)
	}
	if len(ports) != 3 {
		t.Fatalf("expected 3 ports, got %d", len(ports))
	}
	if cfg.Timeout != defaultProbeTimeout {
		t.Fatalf("expected default timeout %s, got %s", defaultProbeTimeout, cfg.Timeout)
	}
	if cfg.Concurrency != 3 {
		t.Fatalf("expected concurrency capped to port count 3, got %d", cfg.Concurrency)
	}

	if _, _, _, err := normalizePortScanRequest("example.com", "", time.Second, 10); err == nil {
		t.Fatal("expected ports validation error")
	}
	if _, _, _, err := normalizePortScanRequest("example.com", "1-5000", time.Second, 10); err == nil {
		t.Fatal("expected max port count validation error")
	}
	if _, _, _, err := normalizePortScanRequest("example.com", "80,443", time.Second, maxScanConcurrency+1); err == nil {
		t.Fatal("expected concurrency validation error")
	}
}

func TestNormalizeArgsKeepsBoolFlagsFromConsumingHost(t *testing.T) {
	fs := newPingFlagSet()
	if err := fs.Parse(normalizeArgs(fs, []string{"--ipv6", "example.com"})); err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if fs.NArg() != 1 || fs.Arg(0) != "example.com" {
		t.Fatalf("expected host to remain positional, got %q", fs.Arg(0))
	}
}

func TestNormalizeArgsMovesValueFlagsAheadOfPositionals(t *testing.T) {
	fs := newTCPPingFlagSet()
	if err := fs.Parse(normalizeArgs(fs, []string{"example.com", "--port", "443"})); err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	portValue := fs.Lookup("port").Value.String()
	if portValue != "443" {
		t.Fatalf("expected port flag to parse as 443, got %s", portValue)
	}
	if fs.NArg() != 1 || fs.Arg(0) != "example.com" {
		t.Fatalf("expected host positional arg, got %q", fs.Arg(0))
	}
}

func TestHandlePingRejectsInvalidPayload(t *testing.T) {
	st := installTestStore(t)
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com","count":101}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}

	var resp apiError
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !strings.Contains(resp.Error, "count must be") {
		t.Fatalf("unexpected error message: %q", resp.Error)
	}
}

func TestHandleAuthSessionReturnsUnauthenticatedWithoutCookie(t *testing.T) {
	installTestStore(t)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/session", nil)
	rr := httptest.NewRecorder()

	handleAuthSession(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp authSessionResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Authenticated {
		t.Fatal("expected unauthenticated session response")
	}
}

func TestAuthDemoLoginFlow(t *testing.T) {
	installTestStore(t)
	originalEnabled := appDemoEnabled
	originalName := appDemoName
	originalEmail := appDemoEmail
	originalCreatedAt := appDemoCreatedAt
	t.Cleanup(func() {
		appDemoEnabled = originalEnabled
		appDemoName = originalName
		appDemoEmail = originalEmail
		appDemoCreatedAt = originalCreatedAt
	})

	appDemoEnabled = true
	appDemoName = "Contributor Demo"
	appDemoEmail = "demo@netwatcher.local"
	appDemoCreatedAt = time.Now().UTC()

	req := httptest.NewRequest(http.MethodPost, "/api/auth/demo-login", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handleAuthDemoLogin(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	result := rr.Result()
	var sessionCookie *http.Cookie
	for _, cookie := range result.Cookies() {
		if cookie.Name == authCookieName {
			sessionCookie = cookie
			break
		}
	}
	if sessionCookie == nil || sessionCookie.Value == "" {
		t.Fatal("expected auth session cookie to be issued")
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/auth/session", nil)
	sessionReq.AddCookie(sessionCookie)
	sessionRR := httptest.NewRecorder()
	handleAuthSession(sessionRR, sessionReq)

	if sessionRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", sessionRR.Code)
	}

	var sessionResp authSessionResponse
	if err := json.Unmarshal(sessionRR.Body.Bytes(), &sessionResp); err != nil {
		t.Fatalf("decode demo session response: %v", err)
	}
	if !sessionResp.Authenticated || sessionResp.Mode != "demo" || sessionResp.ReadOnly {
		t.Fatalf("unexpected demo session response: %#v", sessionResp)
	}
}

func TestAuthLogoutClearsDemoCookie(t *testing.T) {
	installTestStore(t)
	originalEnabled := appDemoEnabled
	originalName := appDemoName
	originalEmail := appDemoEmail
	t.Cleanup(func() {
		appDemoEnabled = originalEnabled
		appDemoName = originalName
		appDemoEmail = originalEmail
	})

	appDemoEnabled = true
	appDemoName = "Contributor Demo"
	appDemoEmail = "demo-logout@netwatcher.local"

	ctx := context.Background()
	user, err := appStore.GetUserByEmail(ctx, appDemoEmail)
	if err != nil {
		if !errors.Is(err, store.ErrUserNotFound) {
			t.Fatalf("load demo user: %v", err)
		}
		passwordHash, hashErr := bcrypt.GenerateFromPassword([]byte("temporary-demo-password"), bcrypt.DefaultCost)
		if hashErr != nil {
			t.Fatalf("hash demo password: %v", hashErr)
		}
		user, err = appStore.CreateUser(ctx, appDemoName, appDemoEmail, string(passwordHash), false)
		if err != nil {
			t.Fatalf("create demo user: %v", err)
		}
	}
	token, tokenHash, err := generateSessionToken()
	if err != nil {
		t.Fatalf("generate demo session token: %v", err)
	}
	if err := appStore.CreateSession(ctx, user.ID, tokenHash, time.Now().Add(time.Hour)); err != nil {
		t.Fatalf("create demo session: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: authCookieName, Value: token})
	rr := httptest.NewRecorder()

	handleAuthLogout(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	result := rr.Result()
	cleared := false
	for _, cookie := range result.Cookies() {
		if cookie.Name == authCookieName && cookie.MaxAge < 0 {
			cleared = true
			break
		}
	}
	if !cleared {
		t.Fatal("expected auth cookie to be cleared")
	}
}

func TestAuthSignupLoginLogoutFlow(t *testing.T) {
	installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("auth_%d@example.com", time.Now().UnixNano())
	password := "S3curePass!"
	signupBody := fmt.Sprintf(`{"name":"Test User","email":"%s","password":"%s"}`, email, password)
	signupReq := httptest.NewRequest(http.MethodPost, "/api/auth/signup", strings.NewReader(signupBody))
	signupReq.Header.Set("Content-Type", "application/json")
	signupRR := httptest.NewRecorder()

	handleAuthSignup(signupRR, signupReq)

	if signupRR.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", signupRR.Code, signupRR.Body.String())
	}
	var signupResp authMessageResponse
	if err := json.Unmarshal(signupRR.Body.Bytes(), &signupResp); err != nil {
		t.Fatalf("failed to decode signup response: %v", err)
	}
	if !signupResp.VerificationRequired || signupResp.Email != email || signupResp.PreviewCode == "" {
		t.Fatalf("unexpected signup response: %#v", signupResp)
	}

	loginBeforeVerifyReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, password)))
	loginBeforeVerifyReq.Header.Set("Content-Type", "application/json")
	loginBeforeVerifyRR := httptest.NewRecorder()
	handleAuthLogin(loginBeforeVerifyRR, loginBeforeVerifyReq)
	if loginBeforeVerifyRR.Code != http.StatusForbidden {
		t.Fatalf("expected 403 before email verification, got %d: %s", loginBeforeVerifyRR.Code, loginBeforeVerifyRR.Body.String())
	}
	var loginBeforeVerifyResp authMessageResponse
	if err := json.Unmarshal(loginBeforeVerifyRR.Body.Bytes(), &loginBeforeVerifyResp); err != nil {
		t.Fatalf("failed to decode pre-verification login response: %v", err)
	}
	if !loginBeforeVerifyResp.VerificationRequired || loginBeforeVerifyResp.Email != email {
		t.Fatalf("unexpected pre-verification login response: %#v", loginBeforeVerifyResp)
	}

	resendReq := httptest.NewRequest(http.MethodPost, "/api/auth/resend-verification", strings.NewReader(fmt.Sprintf(`{"email":"%s"}`, email)))
	resendReq.Header.Set("Content-Type", "application/json")
	resendRR := httptest.NewRecorder()
	handleAuthResendVerification(resendRR, resendReq)
	if resendRR.Code != http.StatusOK {
		t.Fatalf("expected 200 from resend verification, got %d: %s", resendRR.Code, resendRR.Body.String())
	}
	var resendResp authMessageResponse
	if err := json.Unmarshal(resendRR.Body.Bytes(), &resendResp); err != nil {
		t.Fatalf("failed to decode resend verification response: %v", err)
	}
	if resendResp.Email != email || !strings.Contains(strings.ToLower(resendResp.Message), "still active") {
		t.Fatalf("unexpected resend verification response: %#v", resendResp)
	}

	verifyBody := fmt.Sprintf(`{"email":"%s","code":"%s"}`, email, signupResp.PreviewCode)
	verifyReq := httptest.NewRequest(http.MethodPost, "/api/auth/verify-email", strings.NewReader(verifyBody))
	verifyReq.Header.Set("Content-Type", "application/json")
	verifyRR := httptest.NewRecorder()
	handleAuthVerifyEmail(verifyRR, verifyReq)
	if verifyRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", verifyRR.Code, verifyRR.Body.String())
	}
	verifyCookie := extractAuthCookie(t, verifyRR.Result())

	loginBody := fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, password)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRR := httptest.NewRecorder()
	handleAuthLogin(loginRR, loginReq)
	if loginRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", loginRR.Code, loginRR.Body.String())
	}
	loginCookie := extractAuthCookie(t, loginRR.Result())

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/auth/session", nil)
	sessionReq.AddCookie(verifyCookie)
	sessionRR := httptest.NewRecorder()
	handleAuthSession(sessionRR, sessionReq)
	if sessionRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", sessionRR.Code)
	}

	protectedReq := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}`))
	protectedReq.Header.Set("Content-Type", "application/json")
	protectedReq.AddCookie(loginCookie)
	protectedRR := httptest.NewRecorder()
	handlePing(protectedRR, protectedReq)
	if protectedRR.Code == http.StatusUnauthorized {
		t.Fatal("expected authenticated request to pass auth gate")
	}

	unauthReq := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}`))
	unauthReq.Header.Set("Content-Type", "application/json")
	unauthRR := httptest.NewRecorder()
	handlePing(unauthRR, unauthReq)
	if unauthRR.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", unauthRR.Code)
	}
}

func TestAuthSignupAcceptsFirstAndLastName(t *testing.T) {
	installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("names_%d@example.com", time.Now().UnixNano())
	body := fmt.Sprintf(`{"first_name":"Test","last_name":"Operator","email":"%s","password":"S3curePass!","confirm_password":"S3curePass!"}`, email)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handleAuthSignup(rr, req)

	if rr.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestAuthRejectsMismatchedConfirmPassword(t *testing.T) {
	installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("mismatch_%d@example.com", time.Now().UnixNano())
	signupReq := httptest.NewRequest(http.MethodPost, "/api/auth/signup", strings.NewReader(fmt.Sprintf(`{"name":"Mismatch User","email":"%s","password":"S3curePass!","confirm_password":"DifferentPass!"}`, email)))
	signupReq.Header.Set("Content-Type", "application/json")
	signupRR := httptest.NewRecorder()
	handleAuthSignup(signupRR, signupReq)
	if signupRR.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for signup mismatch, got %d: %s", signupRR.Code, signupRR.Body.String())
	}

	resetReq := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"abc","password":"S3curePass!","confirm_password":"DifferentPass!"}`))
	resetReq.Header.Set("Content-Type", "application/json")
	resetRR := httptest.NewRecorder()
	handleAuthResetPassword(resetRR, resetReq)
	if resetRR.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for reset mismatch, got %d: %s", resetRR.Code, resetRR.Body.String())
	}
}

func TestAuthForgotAndResetPasswordFlow(t *testing.T) {
	st := installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("reset_%d@example.com", time.Now().UnixNano())
	password := "S3curePass!"
	newPassword := "An0therPass!"
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := st.CreateUser(ctx, "Reset User", email, string(hash), false); err != nil {
		t.Fatalf("create verified user: %v", err)
	}

	forgotReq := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(fmt.Sprintf(`{"email":"%s"}`, email)))
	forgotReq.Host = "127.0.0.1:8080"
	forgotReq.Header.Set("Content-Type", "application/json")
	forgotRR := httptest.NewRecorder()
	handleAuthForgotPassword(forgotRR, forgotReq)
	if forgotRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", forgotRR.Code, forgotRR.Body.String())
	}

	var forgotResp authMessageResponse
	if err := json.Unmarshal(forgotRR.Body.Bytes(), &forgotResp); err != nil {
		t.Fatalf("decode forgot response: %v", err)
	}
	if forgotResp.PreviewURL == "" {
		t.Fatal("expected preview reset URL for local host")
	}
	resetURL, err := url.Parse(forgotResp.PreviewURL)
	if err != nil {
		t.Fatalf("parse preview URL: %v", err)
	}
	token := resetURL.Query().Get("token")
	if token == "" {
		t.Fatal("expected reset token in preview URL")
	}

	resetReq := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(fmt.Sprintf(`{"token":"%s","password":"%s"}`, token, newPassword)))
	resetReq.Header.Set("Content-Type", "application/json")
	resetRR := httptest.NewRecorder()
	handleAuthResetPassword(resetRR, resetReq)
	if resetRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", resetRR.Code, resetRR.Body.String())
	}

	oldLoginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, password)))
	oldLoginReq.Header.Set("Content-Type", "application/json")
	oldLoginRR := httptest.NewRecorder()
	handleAuthLogin(oldLoginRR, oldLoginReq)
	if oldLoginRR.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for old password, got %d", oldLoginRR.Code)
	}

	newLoginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, newPassword)))
	newLoginReq.Header.Set("Content-Type", "application/json")
	newLoginRR := httptest.NewRecorder()
	handleAuthLogin(newLoginRR, newLoginReq)
	if newLoginRR.Code != http.StatusOK {
		t.Fatalf("expected 200 for new password, got %d: %s", newLoginRR.Code, newLoginRR.Body.String())
	}
}

func TestHandleAuthLoginRateLimited(t *testing.T) {
	st := installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("loginlimit_%d@example.com", time.Now().UnixNano())
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	hash, err := bcrypt.GenerateFromPassword([]byte("CorrectHorseBatteryStaple"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	if _, err := st.CreateUser(ctx, "Rate Limited User", email, string(hash), false); err != nil {
		t.Fatalf("create user: %v", err)
	}

	body := fmt.Sprintf(`{"email":"%s","password":"wrong-password"}`, email)
	for attempt := 1; attempt <= 8; attempt++ {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		handleAuthLogin(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: expected 401, got %d: %s", attempt, rr.Code, rr.Body.String())
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handleAuthLogin(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestHandleAuthResendVerificationUsesCooldown(t *testing.T) {
	st := installTestStore(t)
	resetAuthRateLimiterForTest(t)

	email := fmt.Sprintf("verifycooldown_%d@example.com", time.Now().UnixNano())
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	user, err := st.CreateUser(ctx, "Pending User", email, "test-password-hash", true)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := st.CreateEmailVerificationCode(ctx, user.ID, hashOpaqueToken("123456"), time.Now().Add(defaultVerifyCodeTTL)); err != nil {
		t.Fatalf("seed verification code: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/resend-verification", strings.NewReader(fmt.Sprintf(`{"email":"%s"}`, email)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handleAuthResendVerification(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	var resp authMessageResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !strings.Contains(strings.ToLower(resp.Message), "still active") {
		t.Fatalf("unexpected response: %#v", resp)
	}
}

func TestPrepareVerificationChallengeCleansUpCodeWhenEmailSendFails(t *testing.T) {
	st := installTestStore(t)
	installFailingTestMailer(t)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := st.CreateUser(ctx, "Mailer Failure User", fmt.Sprintf("verify_fail_%d@example.com", time.Now().UnixNano()), "hash", true)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", nil)
	resp, err := prepareVerificationChallenge(ctx, req, user)
	if err != nil {
		t.Fatalf("prepareVerificationChallenge returned error: %v", err)
	}
	if !strings.Contains(strings.ToLower(resp.Message), "email delivery failed") {
		t.Fatalf("unexpected response: %#v", resp)
	}

	recent, err := st.HasRecentEmailVerificationCode(ctx, user.ID, time.Now().Add(-defaultVerifyCodeTTL))
	if err != nil {
		t.Fatalf("HasRecentEmailVerificationCode returned error: %v", err)
	}
	if recent {
		t.Fatal("expected verification code to be cleaned up after send failure")
	}
}

func TestHandleAuthForgotPasswordCleansUpTokenWhenEmailSendFails(t *testing.T) {
	st := installTestStore(t)
	installFailingTestMailer(t)
	resetAuthRateLimiterForTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	email := fmt.Sprintf("reset_fail_%d@example.com", time.Now().UnixNano())
	hash, err := bcrypt.GenerateFromPassword([]byte("CorrectHorseBatteryStaple"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user, err := st.CreateUser(ctx, "Reset Failure User", email, string(hash), false)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(fmt.Sprintf(`{"email":"%s"}`, email)))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handleAuthForgotPassword(rr, req)

	if rr.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", rr.Code, rr.Body.String())
	}

	recent, err := st.HasRecentPasswordResetToken(ctx, user.ID, time.Now().Add(-defaultResetTTL))
	if err != nil {
		t.Fatalf("HasRecentPasswordResetToken returned error: %v", err)
	}
	if recent {
		t.Fatal("expected password reset token to be cleaned up after send failure")
	}
}

func TestRateLimiterSweepPrunesStaleBuckets(t *testing.T) {
	rl := newRateLimiter()
	old := time.Now().Add(-(rateLimitBucketTTL + time.Minute))
	rl.buckets["stale"] = &rateLimitBucket{
		hits:     []time.Time{old},
		lastSeen: old,
	}
	rl.lastSweep = old

	allowed, retryAfter := rl.Allow("fresh", rateLimitConfig{Limit: 2, Window: time.Minute})
	if !allowed || retryAfter != 0 {
		t.Fatalf("expected fresh request to be allowed, got allowed=%v retryAfter=%s", allowed, retryAfter)
	}
	if _, ok := rl.buckets["stale"]; ok {
		t.Fatal("expected stale bucket to be pruned during sweep")
	}
}

func TestAlertRulesCRUDFlow(t *testing.T) {
	st := installTestStore(t)
	cookie := issueTestSessionCookie(t, st)

	createReq := httptest.NewRequest(http.MethodPost, "/api/alerts/rules", strings.NewReader(`{
		"name":"Latency guard",
		"protocol":"ping",
		"target":"example.com",
		"latency_threshold_ms":200,
		"consecutive_breaches":2,
		"cooldown_minutes":15
	}`))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.AddCookie(cookie)
	createRR := httptest.NewRecorder()
	handleAlertRules(createRR, createReq)
	if createRR.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", createRR.Code, createRR.Body.String())
	}

	var created store.AlertRule
	if err := json.Unmarshal(createRR.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode created rule: %v", err)
	}
	if created.ID == 0 || created.Protocol != "ping" || created.Target != "example.com" {
		t.Fatalf("unexpected created rule: %#v", created)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/alerts/rules", nil)
	listReq.AddCookie(cookie)
	listRR := httptest.NewRecorder()
	handleAlertRules(listRR, listReq)
	if listRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", listRR.Code, listRR.Body.String())
	}

	var rules []store.AlertRule
	if err := json.Unmarshal(listRR.Body.Bytes(), &rules); err != nil {
		t.Fatalf("decode rules: %v", err)
	}
	if len(rules) != 1 || rules[0].ID != created.ID {
		t.Fatalf("unexpected rules: %#v", rules)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/alerts/rules?id=%d", created.ID), nil)
	deleteReq.AddCookie(cookie)
	deleteRR := httptest.NewRecorder()
	handleAlertRules(deleteRR, deleteReq)
	if deleteRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", deleteRR.Code, deleteRR.Body.String())
	}
}

func TestBuildDashboardURLUsesPanel(t *testing.T) {
	oldBase := appPublicBaseURL
	appPublicBaseURL = "https://netwatcher.example.com"
	t.Cleanup(func() {
		appPublicBaseURL = oldBase
	})

	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080/", nil)
	got := buildDashboardURL(req, "alerts")
	want := "https://netwatcher.example.com/alerts"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestNewBackendFallbackHandler(t *testing.T) {
	handler := newBackendFallbackHandler()

	rootReq := httptest.NewRequest(http.MethodGet, "/", nil)
	rootRR := httptest.NewRecorder()
	handler.ServeHTTP(rootRR, rootReq)
	if rootRR.Code != http.StatusOK {
		t.Fatalf("root: expected 200, got %d", rootRR.Code)
	}
	if !strings.Contains(rootRR.Body.String(), "netwatcher-api") {
		t.Fatalf("root: unexpected body %q", rootRR.Body.String())
	}

	unknownReq := httptest.NewRequest(http.MethodGet, "/login", nil)
	unknownRR := httptest.NewRecorder()
	handler.ServeHTTP(unknownRR, unknownReq)
	if unknownRR.Code != http.StatusNotFound {
		t.Fatalf("unknown: expected 404, got %d", unknownRR.Code)
	}
}

func TestHandlePingRejectsForbiddenOrigin(t *testing.T) {
	st := installTestStore(t)
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://evil.example")
	req.Host = "127.0.0.1:8080"
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}
}

func TestHandlePingRejectsOversizedBody(t *testing.T) {
	st := installTestStore(t)
	host := strings.Repeat("a", maxJSONBodyBytes)
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"`+host+`"}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "request body too large") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandlePingRejectsTrailingJSON(t *testing.T) {
	st := installTestStore(t)
	req := httptest.NewRequest(http.MethodPost, "/api/ping", strings.NewReader(`{"host":"example.com"}{"extra":true}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handlePing(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "single JSON object") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandleHistoryReturnsStoredPoints(t *testing.T) {
	st := installTestStore(t)
	user, cookie := issueTestSession(t, st)

	now := time.Now()
	st.InsertAsync(store.ResultRecord{
		UserID:   user.ID,
		Ts:       now,
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(12.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory(user.ID, "ping", "example.com", 0, 10)
		return err == nil && len(points) == 1
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=ping&host=example.com&limit=10", nil)
	req.AddCookie(cookie)
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var points []store.HistoryPoint
	if err := json.Unmarshal(rr.Body.Bytes(), &points); err != nil {
		t.Fatalf("failed to decode points: %v", err)
	}
	if len(points) != 1 {
		t.Fatalf("expected 1 point, got %d", len(points))
	}
	if points[0].Seq != 1 {
		t.Fatalf("expected seq 1, got %d", points[0].Seq)
	}
}

func TestHandleHistoryIsUserScoped(t *testing.T) {
	st := installTestStore(t)
	userA, _ := issueTestSession(t, st)
	_, cookieB := issueTestSession(t, st)

	st.InsertAsync(store.ResultRecord{
		UserID:   userA.ID,
		Ts:       time.Now(),
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(8.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory(userA.ID, "ping", "example.com", 0, 10)
		return err == nil && len(points) == 1
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=ping&host=example.com&limit=10", nil)
	req.AddCookie(cookieB)
	rr := httptest.NewRecorder()
	handleHistory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}
	var points []store.HistoryPoint
	if err := json.Unmarshal(rr.Body.Bytes(), &points); err != nil {
		t.Fatalf("decode history response: %v", err)
	}
	if len(points) != 0 {
		t.Fatalf("expected no cross-user history leakage, got %d point(s)", len(points))
	}
}

func TestHandleRecentHistoryTargetsReturnsStoredTargets(t *testing.T) {
	st := installTestStore(t)
	user, cookie := issueTestSession(t, st)

	now := time.Now()
	st.InsertAsync(store.ResultRecord{
		UserID:   user.ID,
		Ts:       now.Add(-2 * time.Minute),
		Protocol: "ping",
		Target:   "one.example",
		Seq:      1,
		RttMs:    float64Ptr(9.5),
	})
	st.InsertAsync(store.ResultRecord{
		UserID:   user.ID,
		Ts:       now.Add(-time.Minute),
		Protocol: "tcpping",
		Target:   "two.example",
		Port:     443,
		Seq:      1,
		RttMs:    float64Ptr(13.2),
	})

	waitFor(t, time.Second, func() bool {
		targets, err := st.QueryRecentHistoryTargets(user.ID, 10)
		return err == nil && len(targets) == 2
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history/recent-targets?limit=10", nil)
	req.AddCookie(cookie)
	rr := httptest.NewRecorder()

	handleRecentHistoryTargets(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var targets []store.RecentHistoryTarget
	if err := json.Unmarshal(rr.Body.Bytes(), &targets); err != nil {
		t.Fatalf("decode recent targets: %v", err)
	}
	if len(targets) != 2 {
		t.Fatalf("expected 2 recent targets, got %d", len(targets))
	}
	if targets[0].Protocol != "tcpping" || targets[0].Target != "two.example" {
		t.Fatalf("unexpected first recent target: %#v", targets[0])
	}
}

func TestHandlePortScanRejectsInvalidPayload(t *testing.T) {
	st := installTestStore(t)
	req := httptest.NewRequest(http.MethodPost, "/api/portscan", strings.NewReader(`{"host":"example.com","ports":"80-9000"}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handlePortScan(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "scan is limited") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestNormalizeDNSLookupTimeoutBounds(t *testing.T) {
	got, err := normalizeDNSLookupTimeout(0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got <= 0 {
		t.Fatalf("expected positive timeout, got %s", got)
	}

	if _, err := normalizeDNSLookupTimeout(50 * time.Millisecond); err == nil {
		t.Fatal("expected error for too-small timeout")
	}
}

func TestHandleDNSLookupRejectsEmptyTarget(t *testing.T) {
	st := installTestStore(t)
	req := httptest.NewRequest(http.MethodPost, "/api/dnslookup", strings.NewReader(`{"target":""}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handleDNSLookup(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "host is required") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandleHistoryNormalizesTCPHostPort(t *testing.T) {
	st := installTestStore(t)
	user, cookie := issueTestSession(t, st)

	now := time.Now()
	st.InsertAsync(store.ResultRecord{
		UserID:   user.ID,
		Ts:       now,
		Protocol: "tcpping",
		Target:   "example.com",
		Port:     443,
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(12.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory(user.ID, "tcpping", "example.com", 443, 10)
		return err == nil && len(points) == 1
	})

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=tcpping&host=example.com:443&limit=10", nil)
	req.AddCookie(cookie)
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var points []store.HistoryPoint
	if err := json.Unmarshal(rr.Body.Bytes(), &points); err != nil {
		t.Fatalf("failed to decode points: %v", err)
	}
	if len(points) != 1 {
		t.Fatalf("expected 1 point, got %d", len(points))
	}
}

func TestHandleHistoryRejectsInvalidLimit(t *testing.T) {
	st := installTestStore(t)

	req := httptest.NewRequest(http.MethodGet, "/api/history?type=ping&host=example.com&limit=5000", nil)
	req.AddCookie(issueTestSessionCookie(t, st))
	rr := httptest.NewRecorder()

	handleHistory(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "limit must be") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

func TestHandleHistoryExportRequiresPostAndIsUserScoped(t *testing.T) {
	st := installTestStore(t)
	userA, cookieA := issueTestSession(t, st)
	_, cookieB := issueTestSession(t, st)

	st.InsertAsync(store.ResultRecord{
		UserID:   userA.ID,
		Ts:       time.Now(),
		Protocol: "ping",
		Target:   "example.com",
		Addr:     "93.184.216.34",
		Seq:      1,
		RttMs:    float64Ptr(15.5),
	})

	waitFor(t, time.Second, func() bool {
		points, err := st.QueryHistory(userA.ID, "ping", "example.com", 0, 10)
		return err == nil && len(points) == 1
	})

	getReq := httptest.NewRequest(http.MethodGet, "/api/export/history", nil)
	getReq.AddCookie(cookieA)
	getRR := httptest.NewRecorder()
	handleHistoryExport(getRR, getReq)
	if getRR.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 405, got %d", getRR.Code)
	}

	postReq := httptest.NewRequest(http.MethodPost, "/api/export/history", strings.NewReader(`{"type":"ping","host":"example.com","limit":10,"format":"json"}`))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.AddCookie(cookieB)
	postRR := httptest.NewRecorder()
	handleHistoryExport(postRR, postReq)

	if postRR.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", postRR.Code, postRR.Body.String())
	}
	if got := strings.TrimSpace(postRR.Body.String()); got != "[]" {
		t.Fatalf("expected empty export for other user, got %s", got)
	}
}

func TestHistoryCSVRowsIncludesHeader(t *testing.T) {
	rows := historyCSVRows([]store.HistoryPoint{{Ts: 123, Seq: 1, RttMs: float64Ptr(1.25)}})
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if got := strings.Join(rows[0], ","); got != "timestamp_ms,sequence,rtt_ms,error" {
		t.Fatalf("unexpected header row: %q", got)
	}
}

func TestHandleTCPPingStoresPerProbeTimestamps(t *testing.T) {
	st := installTestStore(t)
	user, cookie := issueTestSession(t, st)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	port := ln.Addr().(*net.TCPAddr).Port
	body := fmt.Sprintf(`{"host":"127.0.0.1","port":%d,"count":2,"interval_ms":120,"timeout_ms":500}`, port)
	req := httptest.NewRequest(http.MethodPost, "/api/tcpping", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(cookie)
	rr := httptest.NewRecorder()

	handleTCPPing(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var points []store.HistoryPoint
	waitFor(t, 2*time.Second, func() bool {
		var err error
		points, err = st.QueryHistory(user.ID, "tcpping", "127.0.0.1", port, 10)
		return err == nil && len(points) == 2
	})

	if points[0].Ts == points[1].Ts {
		t.Fatalf("expected distinct timestamps, got %d and %d", points[0].Ts, points[1].Ts)
	}

	_ = ln.Close()
	<-done
}

func TestIsAllowedWSOriginAcceptsSameHostAndRejectsDifferentHost(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1:8080/ws", nil)
	req.Host = "127.0.0.1:8080"

	if !isAllowedWSOrigin(req, "http://127.0.0.1:8080") {
		t.Fatal("expected same host origin to be allowed")
	}
	if isAllowedWSOrigin(req, "http://example.com:8080") {
		t.Fatal("expected different host origin to be rejected")
	}
}

func TestHandleWSRejectsInvalidPingRequest(t *testing.T) {
	st := installTestStore(t)
	cookie := issueTestSessionCookie(t, st)

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)
	header.Add("Cookie", cookie.Name+"="+cookie.Value)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(wsRequest{Type: "ping", Host: "example.com", Count: maxProbeCount + 1}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if evt.Type != "error" {
		t.Fatalf("expected error event, got %q", evt.Type)
	}
	if !strings.Contains(evt.Error, "count must be") {
		t.Fatalf("unexpected websocket error: %q", evt.Error)
	}
}

func TestHandleWSRejectsInvalidPortScanRequest(t *testing.T) {
	st := installTestStore(t)
	cookie := issueTestSessionCookie(t, st)

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)
	header.Add("Cookie", cookie.Name+"="+cookie.Value)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(wsRequest{Type: "portscan", Host: "example.com", Ports: "1-9000"}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if evt.Type != "error" {
		t.Fatalf("expected error event, got %q", evt.Type)
	}
	if !strings.Contains(evt.Error, "scan is limited") {
		t.Fatalf("unexpected websocket error: %q", evt.Error)
	}
}

func TestHandleWSRejectsWhenProbeLimiterFull(t *testing.T) {
	fillProbeLimiter()
	defer drainProbeLimiter()
	st := installTestStore(t)
	cookie := issueTestSessionCookie(t, st)

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)
	header.Add("Cookie", cookie.Name+"="+cookie.Value)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	if err := conn.WriteJSON(wsRequest{Type: "ping", Host: "example.com", Count: 1}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read failed: %v", err)
	}
	if evt.Type != "error" || !strings.Contains(evt.Error, "server busy") {
		t.Fatalf("unexpected websocket event: %#v", evt)
	}
}

func TestHandleWSStopCancelsActiveRun(t *testing.T) {
	st := installTestStore(t)
	cookie := issueTestSessionCookie(t, st)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen failed: %v", err)
	}
	defer ln.Close()

	acceptDone := make(chan struct{})
	go func() {
		defer close(acceptDone)
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	server := httptest.NewServer(http.HandlerFunc(handleWS))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	header := http.Header{}
	header.Set("Origin", server.URL)
	header.Add("Cookie", cookie.Name+"="+cookie.Value)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	defer conn.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	if err := conn.WriteJSON(wsRequest{Type: "tcpping", Host: "127.0.0.1", Port: port, Count: 50, IntervalMs: 5000, TimeoutMs: 200}); err != nil {
		t.Fatalf("write failed: %v", err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	var evt wsEvent
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read first event failed: %v", err)
	}
	if evt.Type != "result" {
		t.Fatalf("expected first event to be result, got %#v", evt)
	}

	if err := conn.WriteJSON(wsRequest{Type: "stop"}); err != nil {
		t.Fatalf("stop write failed: %v", err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatalf("read stopped event failed: %v", err)
	}
	if evt.Type != "stopped" {
		t.Fatalf("expected stopped event, got %#v", evt)
	}
	if evt.Summary == nil {
		t.Fatal("expected partial summary on stopped event")
	}
	if evt.Summary.Sent < 1 || evt.Summary.Sent >= 50 {
		t.Fatalf("expected partial run summary, got sent=%d", evt.Summary.Sent)
	}

	_ = ln.Close()
	<-acceptDone
}

func newPingFlagSet() *flag.FlagSet {
	fs := flag.NewFlagSet("ping", flag.ContinueOnError)
	fs.Bool("ipv6", false, "")
	fs.Int("count", 4, "")
	return fs
}

func newTCPPingFlagSet() *flag.FlagSet {
	fs := flag.NewFlagSet("tcpping", flag.ContinueOnError)
	fs.Int("port", defaultTCPPort, "")
	return fs
}

func openTestStore(t *testing.T) *store.Store {
	t.Helper()

	dsn := strings.TrimSpace(os.Getenv("NETWATCHER_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("NETWATCHER_TEST_POSTGRES_DSN is not set")
	}

	st, err := store.OpenConfigured(store.Config{
		DSN:           dsn,
		BatchSize:     1,
		FlushInterval: 5 * time.Millisecond,
		TableName:     testTableName(t.Name()),
	})
	if err != nil {
		t.Fatalf("open test store: %v", err)
	}
	t.Cleanup(func() {
		_ = st.Close()
	})
	return st
}

func installTestStore(t *testing.T) *store.Store {
	t.Helper()

	st := openTestStore(t)
	oldStore := appStore
	oldCache := appCache
	oldObjectStore := appObjectStore
	appStore = st
	appCache = nil
	appObjectStore = nil
	t.Cleanup(func() {
		appStore = oldStore
		appCache = oldCache
		appObjectStore = oldObjectStore
	})
	return st
}

func installFailingTestMailer(t *testing.T) {
	t.Helper()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"message":"mailer unavailable"}`))
	}))
	t.Cleanup(srv.Close)

	client, err := mailer.Open(mailer.Config{
		APIKey:   "test-key",
		From:     "NetWatcher <alerts@example.com>",
		ReplyTo:  "support@example.com",
		Endpoint: srv.URL,
		Timeout:  5 * time.Second,
	})
	if err != nil {
		t.Fatalf("open test mailer: %v", err)
	}

	previous := appMailer
	appMailer = client
	t.Cleanup(func() {
		appMailer = previous
	})
}

func issueTestSessionCookie(t *testing.T, st *store.Store) *http.Cookie {
	t.Helper()
	_, cookie := issueTestSession(t, st)
	return cookie
}

func issueTestSession(t *testing.T, st *store.Store) (store.User, *http.Cookie) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	email := fmt.Sprintf("session_%d@example.com", time.Now().UnixNano())
	user, err := st.CreateUser(ctx, "Session Test User", email, "test-password-hash", false)
	if err != nil {
		t.Fatalf("create session test user: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "http://127.0.0.1", nil)
	rr := httptest.NewRecorder()
	if err := issueSession(rr, req, ctx, user); err != nil {
		t.Fatalf("issue session: %v", err)
	}

	return user, extractAuthCookie(t, rr.Result())
}

func resetAuthRateLimiterForTest(t *testing.T) {
	t.Helper()

	previous := authRateLimiter
	authRateLimiter = newRateLimiter()
	t.Cleanup(func() {
		authRateLimiter = previous
	})
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

func fillProbeLimiter() {
	for i := 0; i < maxConcurrentProbes; i++ {
		probeLimiter <- struct{}{}
	}
}

func drainProbeLimiter() {
	for {
		select {
		case <-probeLimiter:
		default:
			return
		}
	}
}

func extractAuthCookie(t *testing.T, resp *http.Response) *http.Cookie {
	t.Helper()

	for _, cookie := range resp.Cookies() {
		if cookie.Name == authCookieName {
			return cookie
		}
	}
	t.Fatal("expected auth cookie")
	return nil
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
