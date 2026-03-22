package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const resendAPIEndpoint = "https://api.resend.com/emails"

type Config struct {
	APIKey   string
	From     string
	ReplyTo  string
	Endpoint string
	Timeout  time.Duration
}

type Client struct {
	endpoint   string
	apiKey     string
	from       string
	replyTo    string
	httpClient *http.Client
}

type PasswordResetInput struct {
	To        string
	Name      string
	ResetURL  string
	ExpiresIn time.Duration
}

type VerificationOTPInput struct {
	To        string
	Name      string
	Code      string
	ExpiresIn time.Duration
}

type WelcomeEmailInput struct {
	To           string
	Name         string
	DashboardURL string
}

type AlertEmailInput struct {
	To           string
	Name         string
	Severity     string
	Title        string
	Summary      string
	Target       string
	TriggeredAt  time.Time
	DashboardURL string
}

type emailTheme struct {
	Eyebrow    string
	Title      string
	Subtitle   string
	AccentFrom string
	AccentTo   string
}

func Open(cfg Config) (*Client, error) {
	apiKey := strings.TrimSpace(cfg.APIKey)
	if apiKey == "" {
		return nil, nil
	}

	from := strings.TrimSpace(cfg.From)
	if from == "" {
		return nil, errors.New("mailer from address is required")
	}

	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		endpoint = resendAPIEndpoint
	}

	return &Client{
		endpoint: endpoint,
		apiKey:   apiKey,
		from:     from,
		replyTo:  strings.TrimSpace(cfg.ReplyTo),
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}, nil
}

func (c *Client) Enabled() bool {
	return c != nil && c.apiKey != ""
}

func (c *Client) SendPasswordReset(ctx context.Context, in PasswordResetInput) error {
	if c == nil || !c.Enabled() {
		return nil
	}

	to := strings.TrimSpace(in.To)
	if to == "" {
		return errors.New("reset email recipient is required")
	}
	resetURL := strings.TrimSpace(in.ResetURL)
	if resetURL == "" {
		return errors.New("reset URL is required")
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = "Operator"
	}

	minutes := int(in.ExpiresIn.Round(time.Minute).Minutes())
	if minutes <= 0 {
		minutes = 30
	}

	theme := emailTheme{
		Eyebrow:    "Credential Recovery",
		Title:      "Reset your NetWatcher password",
		Subtitle:   "A secure password reset was requested for your control surface.",
		AccentFrom: "#66dcff",
		AccentTo:   "#5a7cff",
	}

	htmlBody := renderEmailShell(theme, fmt.Sprintf(`
<p style="margin:0 0 14px;color:#b6c4d6;font-size:15px;line-height:1.72">Hello %s,</p>
<p style="margin:0 0 18px;color:#dbe6f3;font-size:15px;line-height:1.78">A password reset was requested for your NetWatcher account. Use the secure link below to choose a new password.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px">
  <tr>
    <td style="border-radius:14px;background:linear-gradient(135deg,%s 0%%,%s 100%%);box-shadow:0 18px 30px rgba(69,122,255,0.24)">
      <a href="%s" style="display:inline-block;padding:14px 22px;font-weight:700;font-size:14px;letter-spacing:0.02em;color:#05111a;text-decoration:none;border-radius:14px">Reset Password</a>
    </td>
  </tr>
</table>
<div style="margin:0 0 18px;padding:14px 16px;border-radius:16px;border:1px solid rgba(125,168,224,0.22);background:#0d1826">
  <p style="margin:0 0 8px;color:#8da4bf;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Fallback Link</p>
  <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-word"><a href="%s" style="color:#8bdfff;text-decoration:none">%s</a></p>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="margin:0 0 16px">
  <tr>
    <td style="padding:14px 16px;border-radius:16px;background:#0a1422;border:1px solid rgba(120,146,176,0.16)">
      <p style="margin:0 0 6px;color:#eaf3ff;font-size:13px;font-weight:700">Security Notice</p>
      <p style="margin:0;color:#95a9c1;font-size:13px;line-height:1.7">This reset link expires in %d minutes. If you did not request this change, ignore this email and keep your current password.</p>
    </td>
  </tr>
</table>
`, escapeHTML(name), theme.AccentFrom, theme.AccentTo, escapeHTML(resetURL), escapeHTML(resetURL), escapeHTML(resetURL), minutes), renderEmailSupportFooter(c.replyTo))

	payload := map[string]any{
		"from":    c.from,
		"to":      []string{to},
		"subject": "[NetWatcher] Reset Password Request",
		"html":    htmlBody,
		"text":    fmt.Sprintf("NetWatcher\nCredential Recovery\n\nHello %s,\n\nA password reset was requested for your NetWatcher account.\nUse this secure link to reset your password:\n%s\n\nThis link expires in %d minutes.\nIf you did not request this change, you can ignore this email.\n%s", name, resetURL, minutes, renderEmailSupportFooterText(c.replyTo)),
	}
	if c.replyTo != "" {
		payload["reply_to"] = []string{c.replyTo}
	}

	return c.send(ctx, payload)
}

func (c *Client) SendVerificationOTP(ctx context.Context, in VerificationOTPInput) error {
	if c == nil || !c.Enabled() {
		return nil
	}

	to := strings.TrimSpace(in.To)
	if to == "" {
		return errors.New("verification email recipient is required")
	}
	code := strings.TrimSpace(in.Code)
	if code == "" {
		return errors.New("verification code is required")
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = "Operator"
	}

	minutes := int(in.ExpiresIn.Round(time.Minute).Minutes())
	if minutes <= 0 {
		minutes = 10
	}

	theme := emailTheme{
		Eyebrow:    "Email Verification",
		Title:      "Verify your NetWatcher account",
		Subtitle:   "Confirm this mailbox before access is granted to the dashboard.",
		AccentFrom: "#63ddb8",
		AccentTo:   "#6fbfff",
	}

	htmlBody := renderEmailShell(theme, fmt.Sprintf(`
<p style="margin:0 0 14px;color:#b6c4d6;font-size:15px;line-height:1.72">Hello %s,</p>
<p style="margin:0 0 18px;color:#dbe6f3;font-size:15px;line-height:1.78">Use the one-time verification code below to activate your NetWatcher access.</p>
<div style="margin:0 0 18px;padding:18px 16px;border-radius:18px;border:1px solid rgba(99,221,184,0.24);background:linear-gradient(180deg,#0d1d23,#0b1820);text-align:center">
  <p style="margin:0 0 10px;color:#8ec7b8;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase">Verification Code</p>
  <p style="margin:0;color:#edfbff;font-size:32px;font-weight:800;letter-spacing:0.28em">%s</p>
</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="margin:0 0 16px">
  <tr>
    <td style="padding:14px 16px;border-radius:16px;background:#0a1422;border:1px solid rgba(120,146,176,0.16)">
      <p style="margin:0 0 6px;color:#eaf3ff;font-size:13px;font-weight:700">Verification Window</p>
      <p style="margin:0;color:#95a9c1;font-size:13px;line-height:1.7">This code expires in %d minutes. Enter it on the verification screen to unlock your workspace.</p>
    </td>
  </tr>
</table>
<p style="margin:0;color:#8fa3bc;font-size:13px;line-height:1.7">If you did not create this account, no further action is required.</p>
`, escapeHTML(name), escapeHTML(code), minutes), renderEmailSupportFooter(c.replyTo))

	payload := map[string]any{
		"from":    c.from,
		"to":      []string{to},
		"subject": "[NetWatcher] Verify Your Email",
		"html":    htmlBody,
		"text":    fmt.Sprintf("NetWatcher\nEmail Verification\n\nHello %s,\n\nUse this one-time verification code to activate your NetWatcher account:\n%s\n\nThis code expires in %d minutes.\nIf you did not create this account, you can ignore this email.\n%s", name, code, minutes, renderEmailSupportFooterText(c.replyTo)),
	}
	if c.replyTo != "" {
		payload["reply_to"] = []string{c.replyTo}
	}

	return c.send(ctx, payload)
}

func (c *Client) SendWelcome(ctx context.Context, in WelcomeEmailInput) error {
	if c == nil || !c.Enabled() {
		return nil
	}

	to := strings.TrimSpace(in.To)
	if to == "" {
		return errors.New("welcome email recipient is required")
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = "Operator"
	}

	dashboardURL := strings.TrimSpace(in.DashboardURL)
	if dashboardURL == "" {
		dashboardURL = "#"
	}

	theme := emailTheme{
		Eyebrow:    "Access Activated",
		Title:      "Welcome to NetWatcher",
		Subtitle:   "Your mailbox is verified and your monitoring workspace is ready.",
		AccentFrom: "#67ddff",
		AccentTo:   "#6d81ff",
	}

	htmlBody := renderEmailShell(theme, fmt.Sprintf(`
<p style="margin:0 0 14px;color:#b6c4d6;font-size:15px;line-height:1.72">Hello %s,</p>
<p style="margin:0 0 18px;color:#dbe6f3;font-size:15px;line-height:1.78">Your email has been verified successfully. You now have access to the NetWatcher control surface.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px">
  <tr>
    <td style="border-radius:14px;background:linear-gradient(135deg,%s 0%%,%s 100%%);box-shadow:0 18px 30px rgba(69,122,255,0.24)">
      <a href="%s" style="display:inline-block;padding:14px 22px;font-weight:700;font-size:14px;letter-spacing:0.02em;color:#05111a;text-decoration:none;border-radius:14px">Open Dashboard</a>
    </td>
  </tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="margin:0 0 16px">
  <tr>
    <td style="padding:14px 16px;border-radius:16px;background:#0a1422;border:1px solid rgba(120,146,176,0.16)">
      <p style="margin:0 0 8px;color:#eaf3ff;font-size:13px;font-weight:700">Recommended First Steps</p>
      <ul style="margin:0;padding-left:18px;color:#95a9c1;font-size:13px;line-height:1.8">
        <li>Add your first target and run an ICMP or TCP ping.</li>
        <li>Use Port Scan to inventory exposed services.</li>
        <li>Review history and alerts from the dashboard.</li>
      </ul>
    </td>
  </tr>
</table>
`, escapeHTML(name), theme.AccentFrom, theme.AccentTo, escapeHTML(dashboardURL)), renderEmailSupportFooter(c.replyTo))

	payload := map[string]any{
		"from":    c.from,
		"to":      []string{to},
		"subject": "[NetWatcher] Access Activated",
		"html":    htmlBody,
		"text":    fmt.Sprintf("NetWatcher\nAccess Activated\n\nHello %s,\n\nYour email has been verified successfully. Your monitoring workspace is ready.\nOpen your dashboard:\n%s\n%s", name, dashboardURL, renderEmailSupportFooterText(c.replyTo)),
	}
	if c.replyTo != "" {
		payload["reply_to"] = []string{c.replyTo}
	}

	return c.send(ctx, payload)
}

func (c *Client) SendAlert(ctx context.Context, in AlertEmailInput) error {
	if c == nil || !c.Enabled() {
		return nil
	}

	to := strings.TrimSpace(in.To)
	if to == "" {
		return errors.New("alert email recipient is required")
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = "Operator"
	}

	title := strings.TrimSpace(in.Title)
	if title == "" {
		title = "Monitoring Alert"
	}
	summary := strings.TrimSpace(in.Summary)
	if summary == "" {
		summary = "A NetWatcher alert condition has been triggered."
	}
	severity := strings.ToLower(strings.TrimSpace(in.Severity))
	if severity == "" {
		severity = "warning"
	}
	accentFrom := "#ffc270"
	accentTo := "#ff7a9a"
	label := "Warning"
	switch severity {
	case "critical":
		accentFrom = "#ff8a8a"
		accentTo = "#ff5f7d"
		label = "Critical"
	case "info":
		accentFrom = "#68d6ff"
		accentTo = "#6f83ff"
		label = "Info"
	case "success":
		accentFrom = "#6be3be"
		accentTo = "#63d6ff"
		label = "Resolved"
	}

	triggeredAt := in.TriggeredAt
	if triggeredAt.IsZero() {
		triggeredAt = time.Now().UTC()
	}
	target := strings.TrimSpace(in.Target)
	if target == "" {
		target = "Unspecified target"
	}
	dashboardURL := strings.TrimSpace(in.DashboardURL)

	theme := emailTheme{
		Eyebrow:    "Monitoring Alert",
		Title:      title,
		Subtitle:   summary,
		AccentFrom: accentFrom,
		AccentTo:   accentTo,
	}

	actionBlock := ""
	if dashboardURL != "" {
		actionBlock = fmt.Sprintf(`
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px">
  <tr>
    <td style="border-radius:14px;background:linear-gradient(135deg,%s 0%%,%s 100%%);box-shadow:0 18px 30px rgba(69,122,255,0.22)">
      <a href="%s" style="display:inline-block;padding:14px 22px;font-weight:700;font-size:14px;letter-spacing:0.02em;color:#05111a;text-decoration:none;border-radius:14px">Review Alert</a>
    </td>
  </tr>
</table>
`, accentFrom, accentTo, escapeHTML(dashboardURL))
	}

	htmlBody := renderEmailShell(theme, fmt.Sprintf(`
<p style="margin:0 0 14px;color:#b6c4d6;font-size:15px;line-height:1.72">Hello %s,</p>
<p style="margin:0 0 18px;color:#dbe6f3;font-size:15px;line-height:1.78">%s</p>
<div style="margin:0 0 18px;padding:16px;border-radius:18px;border:1px solid rgba(125,155,191,0.18);background:#0c1624">
  <p style="margin:0 0 8px;color:#8ea4bf;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase">%s Severity</p>
  <p style="margin:0 0 14px;color:#f4f8ff;font-size:22px;font-weight:700">%s</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%">
    <tr>
      <td style="padding:0 0 8px;color:#8fa3bc;font-size:12px;text-transform:uppercase;letter-spacing:0.12em">Target</td>
      <td style="padding:0 0 8px;color:#e6effa;font-size:13px;text-align:right">%s</td>
    </tr>
    <tr>
      <td style="padding:0;color:#8fa3bc;font-size:12px;text-transform:uppercase;letter-spacing:0.12em">Triggered</td>
      <td style="padding:0;color:#e6effa;font-size:13px;text-align:right">%s</td>
    </tr>
  </table>
</div>
%s
`, escapeHTML(name), escapeHTML(summary), escapeHTML(label), escapeHTML(title), escapeHTML(target), escapeHTML(triggeredAt.UTC().Format(time.RFC1123)), actionBlock), renderEmailSupportFooter(c.replyTo))

	textBody := fmt.Sprintf("NetWatcher\nMonitoring Alert\n\nHello %s,\n\n%s\n\nSeverity: %s\nTitle: %s\nTarget: %s\nTriggered: %s\n", name, summary, label, title, target, triggeredAt.UTC().Format(time.RFC1123))
	if dashboardURL != "" {
		textBody += fmt.Sprintf("\nReview Alert:\n%s\n", dashboardURL)
	}
	textBody += renderEmailSupportFooterText(c.replyTo)

	payload := map[string]any{
		"from":    c.from,
		"to":      []string{to},
		"subject": fmt.Sprintf("[NetWatcher] %s Alert", label),
		"html":    htmlBody,
		"text":    textBody,
	}
	if c.replyTo != "" {
		payload["reply_to"] = []string{c.replyTo}
	}

	return c.send(ctx, payload)
}

func (c *Client) send(ctx context.Context, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}

	data, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
	if len(data) == 0 {
		return fmt.Errorf("mailer request failed: %s", res.Status)
	}
	return fmt.Errorf("mailer request failed: %s: %s", res.Status, strings.TrimSpace(string(data)))
}

func escapeHTML(value string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
		"'", "&#39;",
	)
	return replacer.Replace(value)
}

func renderEmailShell(theme emailTheme, content string, footer string) string {
	return fmt.Sprintf(`<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#07111b;color:#eaf3ff;font-family:Arial,'Helvetica Neue',sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">%s</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="background:
linear-gradient(180deg,#07111b 0%%,#0a1522 100%%);padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%" style="max-width:620px">
            <tr>
              <td style="padding:0 0 14px 0">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%">
                  <tr>
                    <td align="left" style="font-size:0">
                      <span style="display:inline-block;width:42px;height:42px;line-height:42px;text-align:center;border-radius:14px;background:linear-gradient(135deg,%s 0%%,%s 100%%);color:#07111b;font-size:13px;font-weight:800;letter-spacing:0.16em">NW</span>
                      <span style="display:inline-block;vertical-align:top;padding-left:12px">
                        <span style="display:block;color:#f7fbff;font-size:20px;font-weight:700;letter-spacing:-0.03em">NetWatcher</span>
                        <span style="display:block;color:#93a7c0;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase">Secure Ops Mail</span>
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border-radius:28px;border:1px solid rgba(125,155,191,0.18);background:
linear-gradient(180deg,#0b1623 0%%,#0b1320 100%%);box-shadow:0 28px 64px rgba(0,0,0,0.28);overflow:hidden">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%%">
                  <tr>
                    <td style="padding:28px 28px 12px 28px;background:
radial-gradient(circle at top right, rgba(104,210,255,0.09), transparent 30%%)">
                      <p style="margin:0 0 10px;color:#8ea4bf;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase">%s</p>
                      <h1 style="margin:0 0 10px;color:#f5f9ff;font-size:30px;line-height:1.06;letter-spacing:-0.04em">%s</h1>
                      <p style="margin:0;color:#aabacc;font-size:14px;line-height:1.72">%s</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 28px 28px 28px">%s</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px 0 8px;text-align:center">
                <p style="margin:0;color:#6f839a;font-size:12px;line-height:1.7">This message was sent by NetWatcher secure operations mail.</p>
                %s
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
		escapeHTML(theme.Subtitle),
		theme.AccentFrom,
		theme.AccentTo,
		escapeHTML(theme.Eyebrow),
		escapeHTML(theme.Title),
		escapeHTML(theme.Subtitle),
		content,
		footer,
	)
}

func renderEmailSupportFooter(replyTo string) string {
	replyTo = escapeHTML(strings.TrimSpace(replyTo))
	if replyTo == "" {
		return `<p style="margin:8px 0 0;color:#6f839a;font-size:12px;line-height:1.7">NetWatcher secure mail channel.</p>`
	}
	return fmt.Sprintf(`<p style="margin:8px 0 0;color:#6f839a;font-size:12px;line-height:1.7">Need help? Reply to <a href="mailto:%s" style="color:#8bdfff;text-decoration:none">%s</a>.</p>`, replyTo, replyTo)
}

func renderEmailSupportFooterText(replyTo string) string {
	replyTo = strings.TrimSpace(replyTo)
	if replyTo == "" {
		return "\nNetWatcher secure mail channel.\n"
	}
	return fmt.Sprintf("\nNeed help? Reply to %s.\n", replyTo)
}
