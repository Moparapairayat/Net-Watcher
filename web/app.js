const dashboardNavButtons = document.querySelectorAll(".dashboard-nav-button");
const sidebarGroups = document.querySelectorAll(".sidebar-group");
const sidebarGroupToggles = document.querySelectorAll(".sidebar-group-toggle");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const dashboardSidebar = document.getElementById("dashboard-sidebar");
const commandTarget = document.getElementById("command-target");
const commandRun = document.getElementById("command-run");
const commandPanelButtons = document.querySelectorAll(".command-panel-button");
const commandModePill = document.getElementById("command-mode-pill");
const commandHealthPill = document.getElementById("command-health-pill");
const overviewClock = document.getElementById("overview-clock");
const runtimeRing = document.getElementById("runtime-ring");
const overviewMatrix = document.getElementById("overview-matrix");
const overviewMatrixSummary = document.getElementById("overview-matrix-summary");
const overviewSessionTag = document.getElementById("overview-session-tag");
const overviewFocusTarget = document.getElementById("overview-focus-target");
const overviewLiveTargets = document.getElementById("overview-live-targets");
const overviewLiveTargetsCopy = document.getElementById("overview-live-targets-copy");
const overviewCriticalTotal = document.getElementById("overview-critical-total");
const overviewWarningTotal = document.getElementById("overview-warning-total");
const overviewStableTotal = document.getElementById("overview-stable-total");
const overviewStreamingTotal = document.getElementById("overview-streaming-total");
const overviewFeedBuffer = document.getElementById("overview-feed-buffer");
const overviewLastEventTitle = document.getElementById("overview-last-event-title");
const overviewLastEventCopy = document.getElementById("overview-last-event-copy");
const overviewLastEventStamp = document.getElementById("overview-last-event-stamp");
const overviewHealthDonut = document.getElementById("overview-health-donut");
const overviewTargetsBody = document.getElementById("overview-targets-body");
const incidentSummaryPill = document.getElementById("incident-summary-pill");
const incidentRing = document.getElementById("incident-ring");
const incidentTotal = document.getElementById("incident-total");
const incidentCriticalCount = document.getElementById("incident-critical-count");
const incidentWarningCount = document.getElementById("incident-warning-count");
const incidentHealthyCount = document.getElementById("incident-healthy-count");
const incidentRunningCount = document.getElementById("incident-running-count");
const incidentCriticalBar = document.getElementById("incident-critical-bar");
const incidentWarningBar = document.getElementById("incident-warning-bar");
const incidentHealthyBar = document.getElementById("incident-healthy-bar");
const incidentRunningBar = document.getElementById("incident-running-bar");
const incidentHotlist = document.getElementById("incident-hotlist");
const incidentTimelineChart = document.getElementById("incident-timeline-chart");
const overviewLatencyState = document.getElementById("overview-latency-state");
const overviewLatencyStrip = document.getElementById("overview-latency-strip");
const overviewLatencyPeak = document.getElementById("overview-latency-peak");
const overviewLatencyFloor = document.getElementById("overview-latency-floor");
const overviewLatencyMedian = document.getElementById("overview-latency-median");
const overviewDensityStrip = document.getElementById("overview-density-strip");
const protocolSummaryPill = document.getElementById("protocol-summary-pill");
const protocolDonutChart = document.getElementById("protocol-donut-chart");
const protocolBars = document.getElementById("protocol-bars");
const telemetryFeed = document.getElementById("telemetry-feed");
const runtimeSummaryChart = document.getElementById("runtime-summary-chart");
const kpiRuntimeStatus = document.getElementById("kpi-runtime-status");
const kpiRuntimeCopy = document.getElementById("kpi-runtime-copy");
const kpiAlertRules = document.getElementById("kpi-alert-rules");
const kpiAlertCopy = document.getElementById("kpi-alert-copy");
const kpiLiveMonitors = document.getElementById("kpi-live-monitors");
const kpiMonitorCopy = document.getElementById("kpi-monitor-copy");
const kpiLastRtt = document.getElementById("kpi-last-rtt");
const kpiRTTCopy = document.getElementById("kpi-rtt-copy");
const monitorClear = document.getElementById("monitor-clear");
const monitorEmpty = document.getElementById("monitor-empty");
const monitorGrid = document.getElementById("monitor-grid");
const dashboardOverview = document.getElementById("dashboard-overview");
const diagnosticsPanel = document.getElementById("diagnostics-panel");
const historyPanel = document.getElementById("history-panel");
const settingsPanel = document.getElementById("settings-panel");
const profilePanel = document.getElementById("profile-panel");
const alertsPanel = document.getElementById("alerts-panel");
// Feature panel references
const dnsPanel = document.getElementById("dns-panel");
const whoisPanel = document.getElementById("whois-panel");
const arpPanel = document.getElementById("arp-panel");
const netstatPanel = document.getElementById("netstat-panel");
const traceroutePanel = document.getElementById("traceroute-panel");
const pingsweepPanel = document.getElementById("pingsweep-panel");
const sslcheckPanel = document.getElementById("sslcheck-panel");
const httpheadersPanel = document.getElementById("httpheaders-panel");
const fingerprintPanel = document.getElementById("fingerprint-panel");
const firewallPanel = document.getElementById("firewall-panel");
const natproxyPanel = document.getElementById("natproxy-panel");
const packetPanel = document.getElementById("packet-panel");
const bandwidthPanel = document.getElementById("bandwidth-panel");
const snmpPanel = document.getElementById("snmp-panel");
const multihostPanel = document.getElementById("multihost-panel");
const geolocationPanel = document.getElementById("geolocation-panel");
const macvendorPanel = document.getElementById("macvendor-panel");
const ipv6Panel = document.getElementById("ipv6-panel");
const loggingPanel = document.getElementById("logging-panel");
const exportPanel = document.getElementById("export-panel");
const visualizationPanel = document.getElementById("visualization-panel");
const schedulerPanel = document.getElementById("scheduler-panel");
const dashboardViewPanel = document.getElementById("dashboard-view-panel");
const apiPanel = document.getElementById("api-panel");
const pluginsPanel = document.getElementById("plugins-panel");
const guiPanel = document.getElementById("gui-panel");
const mobilePanel = document.getElementById("mobile-panel");
const hostField = document.getElementById("host");
const portField = document.getElementById("port");
const portsField = document.getElementById("ports");
const concurrencyField = document.getElementById("concurrency");
const runBtn = document.getElementById("run");
const stopBtn = document.getElementById("stop");
const statusBadge = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");
const errorEl = document.getElementById("error");
const hintEl = document.getElementById("hint");
const tableWrap = document.querySelector(".terminal-table-wrap");
const chartCard = document.getElementById("chart-card");
const chartCanvas = document.getElementById("chart");
const chartLabel = document.getElementById("chart-label");
const chartCtx = chartCanvas.getContext("2d");
const overviewLatencyCtx = overviewLatencyStrip.getContext("2d");
const incidentTimelineCtx = incidentTimelineChart.getContext("2d");
const overviewDensityCtx = overviewDensityStrip.getContext("2d");
const protocolDonutCtx = protocolDonutChart.getContext("2d");
const overviewHealthDonutCtx = overviewHealthDonut.getContext("2d");
const runtimeSummaryCtx = runtimeSummaryChart.getContext("2d");
const resultsCol1 = document.getElementById("results-col-1");
const resultsCol2 = document.getElementById("results-col-2");
const resultsCol3 = document.getElementById("results-col-3");
const resultsCol4 = document.getElementById("results-col-4");
const terminalRunState = document.getElementById("terminal-run-state");
const terminalRunTarget = document.getElementById("terminal-run-target");
const terminalRunMode = document.getElementById("terminal-run-mode");
const terminalRunProtocol = document.getElementById("terminal-run-protocol");
const terminalRunUpdated = document.getElementById("terminal-run-updated");
const terminalSummaryState = document.getElementById("terminal-summary-state");
const terminalEventStamp = document.getElementById("terminal-event-stamp");
const terminalEventTitle = document.getElementById("terminal-event-title");
const terminalEventCopy = document.getElementById("terminal-event-copy");
const terminalStatEvents = document.getElementById("terminal-stat-events");
const terminalStatSignal = document.getElementById("terminal-stat-signal");
const terminalStatLast = document.getElementById("terminal-stat-last");
const terminalStatFeed = document.getElementById("terminal-stat-feed");
const tcpPortField = document.getElementById("tcp-port-field");
const countField = document.getElementById("count-field");
const scanFields = document.getElementById("scan-fields");
const intervalField = document.getElementById("interval-field");
const sizeField = document.getElementById("size-field");
const ipv6Option = document.getElementById("ipv6-option");
const probeRow = tcpPortField.parentElement;
const bootShell = document.getElementById("boot-shell");
const authShell = document.getElementById("auth-shell");
const authStage = document.getElementById("auth-stage");
const appPanel = document.getElementById("app-panel");
const userShell = document.getElementById("user-shell");
const userMenuToggle = document.getElementById("user-menu-toggle");
const userChipIcon = document.getElementById("user-chip-icon");
const userDropdown = document.getElementById("user-dropdown");
const userName = document.getElementById("user-name");
const userLabel = document.getElementById("user-label");
const openSettingsBtn = document.getElementById("open-settings");
const openProfileBtn = document.getElementById("open-profile");
const logoutBtn = document.getElementById("logout");
const authErrorEl = document.getElementById("auth-error");
const authStateCard = document.getElementById("auth-state-card");
const authStateEyebrow = document.getElementById("auth-state-eyebrow");
const authStateTitle = document.getElementById("auth-state-title");
const authStateMessage = document.getElementById("auth-state-message");
const authStateDetail = document.getElementById("auth-state-detail");
const authStatePrimary = document.getElementById("auth-state-primary");
const authStateSecondary = document.getElementById("auth-state-secondary");
const loginTab = document.getElementById("login-tab");
const signupTab = document.getElementById("signup-tab");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const verifyForm = document.getElementById("verify-form");
const forgotForm = document.getElementById("forgot-form");
const resetForm = document.getElementById("reset-form");
const loginSubmit = document.getElementById("login-submit");
const signupSubmit = document.getElementById("signup-submit");
const verifySubmit = document.getElementById("verify-submit");
const forgotSubmit = document.getElementById("forgot-submit");
const resetSubmit = document.getElementById("reset-submit");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authEyebrow = document.getElementById("auth-eyebrow");
const authSceneSwitch = document.getElementById("auth-scene-switch");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const verifyResend = document.getElementById("verify-resend");
const verifyBack = document.getElementById("verify-back");
const forgotBack = document.getElementById("forgot-back");
const resetBack = document.getElementById("reset-back");
const passwordToggles = document.querySelectorAll(".auth-toggle-password");
const alertsNotice = document.getElementById("alerts-notice");
const alertsList = document.getElementById("alerts-list");
const alertsEmpty = document.getElementById("alerts-empty");
const alertsCount = document.getElementById("alerts-count");
const alertForm = document.getElementById("alert-form");
const alertName = document.getElementById("alert-name");
const alertProtocol = document.getElementById("alert-protocol");
const alertTarget = document.getElementById("alert-target");
const alertPortField = document.getElementById("alert-port-field");
const alertPort = document.getElementById("alert-port");
const alertLatencyThreshold = document.getElementById("alert-latency-threshold");
const alertLossThreshold = document.getElementById("alert-loss-threshold");
const alertConsecutive = document.getElementById("alert-consecutive");
const alertCooldown = document.getElementById("alert-cooldown");
const alertEmail = document.getElementById("alert-email");
const alertRecovery = document.getElementById("alert-recovery");
const alertPrefill = document.getElementById("alert-prefill");
const historyRefresh = document.getElementById("history-refresh");
const historyExportJSON = document.getElementById("history-export-json");
const historyExportCSV = document.getElementById("history-export-csv");
const historyContext = document.getElementById("history-context");
const historyEmpty = document.getElementById("history-empty");
const historyTableWrap = document.getElementById("history-table-wrap");
const historyResults = document.getElementById("history-results");
const settingsRefresh = document.getElementById("settings-refresh");
const settingsNotice = document.getElementById("settings-notice");
const settingsOrigin = document.getElementById("settings-origin");
const settingsDBStatus = document.getElementById("settings-db-status");
const settingsDBCopy = document.getElementById("settings-db-copy");
const settingsRedisStatus = document.getElementById("settings-redis-status");
const settingsRedisCopy = document.getElementById("settings-redis-copy");
const settingsObjectStatus = document.getElementById("settings-object-status");
const settingsObjectCopy = document.getElementById("settings-object-copy");
const settingsRealtime = document.getElementById("settings-realtime");
const settingsSession = document.getElementById("settings-session");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileVerification = document.getElementById("profile-verification");
const profileVerificationCopy = document.getElementById("profile-verification-copy");
const profileCreated = document.getElementById("profile-created");
const profileSession = document.getElementById("profile-session");
const profileNotice = document.getElementById("profile-notice");
const profileResetLink = document.getElementById("profile-reset-link");
const profileOpenAlerts = document.getElementById("profile-open-alerts");
const profileLogout = document.getElementById("profile-logout");

let chartData = [];
let currentMode = "ping";
let activeSocket = null;
let activeController = null;
let activeRunMode = null;
let isAuthenticated = false;
let authBusy = false;
let pendingVerificationEmail = "";
let authStatePrimaryHandler = null;
let authStateSecondaryHandler = null;
let authSuccessTimer = null;
let currentUser = null;
let pendingDashboardPanel = getDashboardPanelFromLocation();
let currentPanel = normalizeDashboardPanel(pendingDashboardPanel);
let alertRuleCount = 0;
let runtimeHealth = { ok: null, database: null, redis: null, objectStorage: null, session: null };
let lastProbeSnapshot = null;
let activeMonitorKey = "";
const liveMonitorMap = new Map();
const socTelemetryFeed = [];
let alertRulesCache = [];
const overviewSignalHistory = [];
const terminalTelemetryState = {
  target: "-",
  mode: "ICMP Ping",
  protocol: "icmp",
  updatedAt: 0,
  events: 0,
  signal: "idle",
  feedState: "cold",
  lastRTT: "-",
  state: "idle",
};

document.querySelectorAll("[data-drilldown-panel]").forEach((element) => {
  element.addEventListener("click", (event) => {
    if (!isAuthenticated) {
      return;
    }
    if (event.target.closest("button, a, input, select, textarea, table, thead, tbody, tr, th, td")) {
      return;
    }
    const panel = element.dataset.drilldownPanel;
    if (!panel) {
      return;
    }
    navigateToDashboardPanel(panel, {
      useCurrentTarget: element.dataset.drilldownUsesTarget === "true",
      smooth: false,
    });
  });
});

dashboardNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) {
      return;
    }
    if (!isAuthenticated || activeSocket || activeController) {
      return;
    }
    applyDashboardPanel(btn.dataset.panel || btn.dataset.mode || "ping", { pushHistory: true });
  });
});

sidebarGroupToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const group = toggle.closest(".sidebar-group");
    if (!group) {
      return;
    }
    const body = group.querySelector(".sidebar-group-body");
    const shouldOpen = !group.classList.contains("is-open");
    group.classList.toggle("is-open", shouldOpen);
    toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    if (body) {
      body.classList.toggle("hidden", !shouldOpen);
    }
  });
});

sidebarToggle.addEventListener("click", () => {
  toggleSidebar(!appPanel.classList.contains("sidebar-open"));
});

sidebarBackdrop.addEventListener("click", () => {
  toggleSidebar(false);
});

commandPanelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!isAuthenticated) {
      return;
    }
    const requestedPanel = button.dataset.panel || "overview";
    const nextPanel = requestedPanel === "ping" ? currentMode : requestedPanel;
    applyDashboardPanel(nextPanel, { pushHistory: true });
  });
});

commandRun.addEventListener("click", () => {
  if (!isAuthenticated) {
    return;
  }
  syncHostFields(commandTarget.value.trim(), "command");
  if (currentPanel !== "ping" && currentPanel !== "tcpping" && currentPanel !== "portscan") {
    applyDashboardPanel(currentMode, { pushHistory: true, smooth: false });
  }
  window.setTimeout(() => {
    if (!runBtn.disabled) {
      runBtn.click();
    }
  }, 0);
});

commandTarget.addEventListener("input", () => {
  syncHostFields(commandTarget.value, "command");
});

hostField.addEventListener("input", () => {
  syncHostFields(hostField.value, "form");
});

monitorClear.addEventListener("click", () => {
  liveMonitorMap.clear();
  socTelemetryFeed.length = 0;
  overviewSignalHistory.length = 0;
  activeMonitorKey = "";
  lastProbeSnapshot = null;
  resetTerminalTelemetry(currentMode);
  renderMonitorGrid();
  updateOverviewCards();
});

loginTab.addEventListener("click", () => setAuthMode("login", { pushHistory: true }));
signupTab.addEventListener("click", () => setAuthMode("signup", { pushHistory: true }));
authSceneSwitch.addEventListener("click", () => {
  let nextMode = "login";
  switch (authModeFromLocation()) {
    case "login":
      nextMode = "signup";
      break;
    case "signup":
      nextMode = "login";
      break;
    case "forgot":
      nextMode = "signup";
      break;
    case "reset":
      nextMode = "login";
      break;
  }
  setAuthMode(nextMode, { pushHistory: true });
});
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("login");
});
signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("signup");
});
verifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitEmailVerification();
});
forgotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitForgotPassword();
});
resetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitPasswordReset();
});
logoutBtn.addEventListener("click", logout);
forgotPasswordLink.addEventListener("click", () => setAuthMode("forgot", { pushHistory: true }));
verifyResend.addEventListener("click", resendVerificationCode);
verifyBack.addEventListener("click", () => setAuthMode("login", { pushHistory: true }));
forgotBack.addEventListener("click", () => setAuthMode("login", { pushHistory: true }));
resetBack.addEventListener("click", () => setAuthMode("login", { pushHistory: true }));
passwordToggles.forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});
authStatePrimary.addEventListener("click", () => {
  if (typeof authStatePrimaryHandler === "function") {
    authStatePrimaryHandler();
  }
});
authStateSecondary.addEventListener("click", () => {
  if (typeof authStateSecondaryHandler === "function") {
    authStateSecondaryHandler();
  }
});
alertForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveAlertRule();
});
alertProtocol.addEventListener("change", updateAlertProtocolUI);
alertPrefill.addEventListener("click", prefillAlertRuleFromCurrentTarget);
historyRefresh.addEventListener("click", () => {
  void loadDashboardHistory();
});
historyExportJSON.addEventListener("click", () => {
  void downloadHistoryExport("json");
});
historyExportCSV.addEventListener("click", () => {
  void downloadHistoryExport("csv");
});
settingsRefresh.addEventListener("click", () => {
  void refreshSettingsPanel(true);
});
profileResetLink.addEventListener("click", () => {
  void sendProfileResetLink();
});
profileOpenAlerts.addEventListener("click", () => {
  applyDashboardPanel("alerts", { pushHistory: true });
});
profileLogout.addEventListener("click", logout);
userMenuToggle.addEventListener("click", () => {
  toggleUserDropdown();
});
openSettingsBtn.addEventListener("click", () => {
  closeUserDropdown();
  applyDashboardPanel("settings", { pushHistory: true });
});
openProfileBtn.addEventListener("click", () => {
  closeUserDropdown();
  applyDashboardPanel("profile", { pushHistory: true });
});

runBtn.addEventListener("click", async () => {
  if (!isAuthenticated || activeSocket || activeController) {
    return;
  }

  clearOutput();

  const mode = currentMode;
  const payload = buildPayload(mode);
  if (!payload) {
    setStatus("Idle", false);
    return;
  }

  activeRunMode = mode;
  markMonitorRunStart(mode, payload);
  updateTableHeaders(mode);

  await loadHistory(mode, payload);
  if (!isAuthenticated) {
    return;
  }

  if (!("WebSocket" in window) || shouldUseHTTPTransport(mode, payload)) {
    runViaHTTP(mode, payload);
    return;
  }

  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${scheme}://${location.host}/ws`);
  activeSocket = ws;
  let finished = false;
  let requestDispatched = false;
  let fallbackStarted = false;

  setStatus("Connecting", true);
  setStopState(false);

  ws.addEventListener("open", () => {
    setStatus("Running", true);
    setStopState(true);
    try {
      ws.send(JSON.stringify({ type: mode, ...payload }));
      requestDispatched = true;
    } catch (err) {
      fallbackStarted = true;
      activeSocket = null;
      ws.close();
      runViaHTTP(mode, payload);
    }
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "result" && msg.result) {
      appendResult(msg.result, msg.addr, msg.ts, mode, msg.protocol);
    }
    if (msg.type === "summary" && msg.summary) {
      finished = true;
      renderSummary(msg.summary, msg.target, msg.addr, mode, msg.protocol);
      setStatus("Done", false);
      setStopState(false);
      ws.close();
    }
    if (msg.type === "stopped") {
      finished = true;
      if (msg.summary) {
        renderSummary(msg.summary, msg.target, msg.addr, mode, msg.protocol);
      }
      setStatus("Stopped", false);
      setStopState(false);
      ws.close();
    }
    if (msg.type === "error") {
      finished = true;
      markMonitorFailure(msg.error || "Request failed");
      errorEl.textContent = msg.error || "Request failed";
      errorEl.classList.remove("hidden");
      setStatus("Error", false);
      setStopState(false);
      ws.close();
    }
  });

  ws.addEventListener("error", () => {
    if (!requestDispatched && !fallbackStarted) {
      finished = true;
      fallbackStarted = true;
      activeSocket = null;
      ws.close();
      runViaHTTP(mode, payload);
      return;
    }

    finished = true;
    markMonitorFailure("Realtime connection failed after the run started.");
    errorEl.textContent = "Realtime connection failed after the run started.";
    errorEl.classList.remove("hidden");
    setStatus("Error", false);
    setStopState(false);
    ws.close();
  });

  ws.addEventListener("close", () => {
    if (activeSocket === ws) {
      activeSocket = null;
    }
    if (fallbackStarted) {
      return;
    }
    if (!finished) {
      if (statusBadge.textContent === "Stopping") {
        setStatus("Stopped", false);
      } else if (statusBadge.textContent === "Running" || statusBadge.textContent === "Connecting") {
        errorEl.textContent = "Connection closed before the run completed.";
        errorEl.classList.remove("hidden");
        markMonitorFailure("Connection closed before the run completed.");
        setStatus("Disconnected", false);
      }
    }
    activeRunMode = null;
    setStopState(false);
  });
});

stopBtn.addEventListener("click", () => {
  if (activeSocket) {
    setStatus("Stopping", true);
    setStopState(false, "Stopping...");

    if (activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(JSON.stringify({ type: "stop" }));
      return;
    }

    activeSocket.close();
    return;
  }

  if (activeController) {
    setStatus("Stopping", true);
    setStopState(false, "Stopping...");
    activeController.abort();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) {
    toggleSidebar(false);
  }
  renderChart();
  renderOverviewLatencyStrip();
  renderOverviewHealthDonut(Array.from(liveMonitorMap.values()));
  renderRuntimeSummaryChart();
  renderProtocolDonut(Array.from(liveMonitorMap.values()));
  renderIncidentTimeline();
  renderOverviewDensityStrip();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !userDropdown.classList.contains("hidden")) {
    closeUserDropdown();
  }
  if (event.key === "Escape" && appPanel.classList.contains("sidebar-open")) {
    toggleSidebar(false);
  }
});

document.addEventListener("click", (event) => {
  if (userDropdown.classList.contains("hidden")) {
    return;
  }
  if (!userShell.contains(event.target)) {
    closeUserDropdown();
  }
});

window.addEventListener("popstate", () => {
  pendingDashboardPanel = getDashboardPanelFromLocation();
  if (!isAuthenticated) {
    const mode = authModeFromLocation();
    setAuthMode(mode, {
      replaceHistory: location.pathname !== authPathForMode(mode),
      updateHistory: true,
    });
    return;
  }
  applyDashboardPanel(pendingDashboardPanel || "overview", { updateHistory: false, smooth: false });
});

initialize();
resetTerminalTelemetry(currentMode);
renderSOCFeed();
updateOverviewClock();
window.setInterval(updateOverviewClock, 1000);

function setBootState(booting) {
  document.body.classList.toggle("app-booting", booting);
  if (bootShell) {
    bootShell.classList.toggle("hidden", !booting);
  }
}

async function initialize() {
  updateModeUI();
  updateAlertProtocolUI();
  setBootState(true);
  await loadSession();
}

function authModeFromLocation() {
  switch (location.pathname) {
    case "/signup":
      return "signup";
    case "/verify-email":
      return "verify";
    case "/forgot-password":
      return "forgot";
    case "/reset-password":
      return "reset";
    default:
      return "login";
  }
}

function authPathForMode(mode) {
  switch (mode) {
    case "signup":
      return "/signup";
    case "verify":
      return "/verify-email";
    case "forgot":
      return "/forgot-password";
    case "reset":
      return "/reset-password";
    default:
      return "/login";
  }
}

function setAuthMode(mode, options = {}) {
  const { pushHistory = false, replaceHistory = false, updateHistory = true, keepState = false } = options;
  if (mode === "reset" && !getResetTokenFromLocation()) {
    mode = "forgot";
  }
  if (!keepState) {
    hideAuthState();
  }

  const loginMode = mode === "login";
  const signupMode = mode === "signup";
  const verifyMode = mode === "verify";
  const forgotMode = mode === "forgot";
  const resetMode = mode === "reset";
  const targetPath = authPathForMode(mode);
  authStage.classList.toggle("login-mode", loginMode);
  authStage.classList.toggle("signup-mode", signupMode);
  authStage.classList.toggle("verify-mode", verifyMode);
  authStage.classList.toggle("forgot-mode", forgotMode);
  authStage.classList.toggle("reset-mode", resetMode);
  loginTab.classList.toggle("active", loginMode);
  signupTab.classList.toggle("active", signupMode);
  loginForm.classList.toggle("hidden", !loginMode);
  signupForm.classList.toggle("hidden", !signupMode);
  verifyForm.classList.toggle("hidden", !verifyMode);
  forgotForm.classList.toggle("hidden", !forgotMode);
  resetForm.classList.toggle("hidden", !resetMode);

  if (loginMode) {
    authTitle.textContent = "SIGN IN";
    authEyebrow.textContent = "NETWATCHER ACCESS";
    authSubtitle.textContent = "Use your email and password to continue.";
    authSceneSwitch.textContent = "Need access? Create account";
  } else if (signupMode) {
    authTitle.textContent = "CREATE ACCOUNT";
    authEyebrow.textContent = "NEW OPERATOR";
    authSubtitle.textContent = "Create your account to start monitoring.";
    authSceneSwitch.textContent = "Already onboarded? Sign in";
  } else if (verifyMode) {
    authTitle.textContent = "VERIFY EMAIL";
    authEyebrow.textContent = "OTP CHALLENGE";
    authSubtitle.textContent = "Enter the one-time code sent to your email to unlock access.";
    authSceneSwitch.textContent = "Back to sign in";
  } else if (forgotMode) {
    authTitle.textContent = "RESET ACCESS";
    authEyebrow.textContent = "PASSWORD RECOVERY";
    authSubtitle.textContent = "Request a reset link for your NetWatcher account.";
    authSceneSwitch.textContent = "Back to account creation";
  } else {
    authTitle.textContent = "NEW PASSWORD";
    authEyebrow.textContent = "RESET TOKEN";
    authSubtitle.textContent = "Set a new password for this account and return to login.";
    authSceneSwitch.textContent = "Back to sign in";
  }
  clearAuthNotice();
  resetPasswordToggles();
  syncVerificationEmailField();
  animateAuthStage();

  if (updateHistory && location.pathname !== targetPath) {
    let targetURL = targetPath;
    if (resetMode && getResetTokenFromLocation()) {
      targetURL = `${targetPath}?token=${encodeURIComponent(getResetTokenFromLocation())}`;
    }
    if (verifyMode) {
      const verificationEmail = pendingVerificationEmail || document.getElementById("verify-email").value.trim() || getVerificationEmailFromLocation();
      if (verificationEmail) {
        targetURL = `${targetPath}?email=${encodeURIComponent(verificationEmail)}`;
      }
    }
    if (pushHistory) {
      history.pushState({}, "", targetURL);
    } else if (replaceHistory) {
      history.replaceState({}, "", targetURL);
    }
  }
}

async function loadSession() {
  try {
    const res = await fetch("/api/auth/session");
    const data = await res.json();
    if (res.ok && data.authenticated && data.user) {
      renderAuthenticated(data.user);
      return;
    }
  } catch (err) {
    renderUnauthenticated("Failed to load session.", authModeFromLocation(), false, "error");
    return;
  }
  renderUnauthenticated();
}

async function submitAuth(mode) {
  if (authBusy) {
    return;
  }

  const payload = mode === "signup"
    ? {
        name: document.getElementById("signup-name").value.trim(),
        email: document.getElementById("signup-email").value.trim(),
        password: document.getElementById("signup-password").value,
      }
    : {
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value,
      };

  setAuthBusy(true, mode);
  clearAuthNotice();

  try {
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 403 && data.verification_required) {
      pendingVerificationEmail = data.email || payload.email || "";
      syncVerificationEmailField(pendingVerificationEmail);
      setAuthMode("verify", { pushHistory: true });
      setAuthNotice(data.message || "Email verification required. Enter the OTP sent to your inbox.", "info");
      return;
    }
    if (!res.ok) {
      throw new Error(data.error || "Authentication failed");
    }
    if (data.verification_required) {
      pendingVerificationEmail = data.email || payload.email || "";
      syncVerificationEmailField(pendingVerificationEmail);
      loginForm.reset();
      signupForm.reset();
      resetPasswordToggles();
      setAuthMode("verify", { pushHistory: true, keepState: true });
      let detail = pendingVerificationEmail ? `We sent a 6-digit code to ${pendingVerificationEmail}.` : "We sent a 6-digit code to your inbox.";
      if (data.preview_code) {
        detail += ` OTP: ${data.preview_code}`;
      }
      showAuthState({
        eyebrow: "Verification Required",
        title: "Check your inbox",
        message: data.message || "Use the email OTP to activate your NetWatcher access.",
        detail,
        primaryLabel: "Enter OTP",
        onPrimary: () => {
          hideAuthState();
          const codeField = document.getElementById("verify-code");
          if (codeField) {
            codeField.focus();
          }
        },
        secondaryLabel: "Use another email",
        onSecondary: () => {
          pendingVerificationEmail = "";
          verifyForm.reset();
          setAuthMode("signup", { replaceHistory: true });
          document.getElementById("signup-email").focus();
        },
      });
      return;
    }
    renderAuthenticated(data.user);
    loginForm.reset();
    signupForm.reset();
    resetPasswordToggles();
  } catch (err) {
    setAuthNotice(err.message, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function submitForgotPassword() {
  if (authBusy) {
    return;
  }

  const payload = {
    email: document.getElementById("forgot-email").value.trim(),
  };

  setAuthBusy(true, "forgot");
  clearAuthNotice();

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to issue reset link");
    }

    let message = data.message || "If an account exists, a reset link has been issued.";
    if (data.preview_url) {
      message += ` Preview: ${data.preview_url}`;
    }
    setAuthNotice(message, "success");
  } catch (err) {
    setAuthNotice(err.message, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function submitEmailVerification() {
  if (authBusy) {
    return;
  }

  const email = document.getElementById("verify-email").value.trim();
  const code = document.getElementById("verify-code").value.trim();
  pendingVerificationEmail = email;

  setAuthBusy(true, "verify");
  clearAuthNotice();

  try {
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to verify email");
    }
    verifyForm.reset();
    pendingVerificationEmail = "";
    setAuthMode("verify", { replaceHistory: true, keepState: true });
    showAuthState({
      eyebrow: "Verification Complete",
      title: "Access granted",
      message: data.message || "Your email has been verified successfully.",
      detail: "Opening your dashboard now.",
      primaryLabel: "Open Dashboard",
      onPrimary: () => {
        clearAuthSuccessTimer();
        renderAuthenticated(data.user);
      },
    });
    authSuccessTimer = window.setTimeout(() => {
      authSuccessTimer = null;
      renderAuthenticated(data.user);
    }, 1200);
  } catch (err) {
    setAuthNotice(err.message, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function resendVerificationCode() {
  if (authBusy) {
    return;
  }

  const email = document.getElementById("verify-email").value.trim();
  pendingVerificationEmail = email;

  setAuthBusy(true, "verify");
  clearAuthNotice();

  try {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to resend verification code");
    }
    let message = data.message || "A fresh verification code has been sent.";
    if (data.preview_code) {
      message += ` OTP: ${data.preview_code}`;
    }
    setAuthNotice(message, "success");
  } catch (err) {
    setAuthNotice(err.message, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function submitPasswordReset() {
  if (authBusy) {
    return;
  }

  const token = getResetTokenFromLocation();
  const password = document.getElementById("reset-password").value;
  const confirm = document.getElementById("reset-password-confirm").value;

  if (!token) {
    setAuthNotice("Reset token is missing. Request a new reset link.", "error");
    setAuthMode("forgot", { replaceHistory: true });
    return;
  }
  if (password !== confirm) {
    setAuthNotice("Passwords do not match.", "error");
    return;
  }

  setAuthBusy(true, "reset");
  clearAuthNotice();

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to reset password");
    }
    resetForm.reset();
    resetPasswordToggles();
    setAuthMode("login", { replaceHistory: true });
    setAuthNotice(data.message || "Password updated. Sign in with your new password.", "success");
  } catch (err) {
    setAuthNotice(err.message, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
  }
  stopActiveRun();
  renderUnauthenticated("Logged out.", "login", true, "success");
}

function renderAuthenticated(user) {
  clearAuthSuccessTimer();
  hideAuthState();
  isAuthenticated = true;
  currentUser = user;
  pendingVerificationEmail = "";
  setBootState(false);
  document.body.classList.remove("auth-active");
  authShell.classList.add("hidden");
  appPanel.classList.remove("hidden");
  userShell.classList.remove("hidden");
  sidebarToggle.classList.remove("hidden");
  userName.textContent = user.name || "Operator";
  userLabel.textContent = user.email || "";
  userShell.title = `${user.name} - ${user.email}`;
  userChipIcon.textContent = (user.name || "OP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "OP";
  closeUserDropdown();
  if (!alertEmail.value) {
    alertEmail.value = user.email || "";
  }
  syncHostFields(hostField.value || commandTarget.value || "", "form");
  renderProfilePanel();
  updateOverviewCards();
  const panel = normalizeDashboardPanel(pendingDashboardPanel || getDashboardPanelFromLocation());
  const nextURL = dashboardURLForPanel(panel);
  if (`${location.pathname}${location.search}` !== nextURL) {
    history.replaceState({}, "", nextURL);
  }
  setStatus("Idle", false);
  syncModeButtons();
  void loadAlertRules().then(() => {
    applyDashboardPanel(panel, { updateHistory: false, smooth: false });
    pendingDashboardPanel = "";
  });
  void refreshSettingsPanel();
}

function renderUnauthenticated(message = "", mode = authModeFromLocation(), replaceHistory = false, messageType = "info") {
  clearAuthSuccessTimer();
  hideAuthState();
  isAuthenticated = false;
  currentUser = null;
  setBootState(false);
  document.body.classList.add("auth-active");
  setAuthMode(mode, { replaceHistory, updateHistory: true });
  authShell.classList.remove("hidden");
  appPanel.classList.add("hidden");
  userShell.classList.add("hidden");
  sidebarToggle.classList.add("hidden");
  pendingDashboardPanel = "";
  currentPanel = "overview";
  alertRuleCount = 0;
  alertRulesCache = [];
  runtimeHealth = { ok: null, database: null, redis: null, objectStorage: null, session: null };
  lastProbeSnapshot = null;
  activeMonitorKey = "";
  liveMonitorMap.clear();
  toggleSidebar(false);
  closeUserDropdown();
  userName.textContent = "Operator";
  userLabel.textContent = "";
  userShell.title = "";
  userChipIcon.textContent = "OP";
  clearAlertsNotice();
  setSettingsNotice("");
  setProfileNotice("");
  clearOutput();
  commandTarget.value = "";
  overviewSignalHistory.length = 0;
  renderMonitorGrid();
  updateOverviewCards();
  setStatus("Locked", false);
  setStopState(false);
  if (message) {
    setAuthNotice(message, messageType);
  }
  syncModeButtons();
}

function handleAuthExpired() {
  stopActiveRun();
  renderUnauthenticated("Session expired. Log in again.", "login", true, "info");
}

function stopActiveRun() {
  if (activeSocket) {
    try {
      activeSocket.close();
    } catch (err) {
    }
    activeSocket = null;
  }
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
  activeRunMode = null;
}

function currentAuthSubmitButton(modeHint = "") {
  switch (modeHint || authModeFromLocation()) {
    case "signup":
      return signupSubmit;
    case "verify":
      return verifySubmit;
    case "forgot":
      return forgotSubmit;
    case "reset":
      return resetSubmit;
    default:
      return loginSubmit;
  }
}

function setAuthBusy(busy, modeHint = "") {
  authBusy = busy;
  loginSubmit.disabled = busy;
  signupSubmit.disabled = busy;
  verifySubmit.disabled = busy;
  forgotSubmit.disabled = busy;
  resetSubmit.disabled = busy;
  loginTab.disabled = busy;
  signupTab.disabled = busy;
  forgotPasswordLink.disabled = busy;
  verifyResend.disabled = busy;
  verifyBack.disabled = busy;
  forgotBack.disabled = busy;
  resetBack.disabled = busy;

  [loginSubmit, signupSubmit, verifySubmit, forgotSubmit, resetSubmit].forEach((button) => {
    button.classList.remove("is-loading");
  });
  if (busy) {
    currentAuthSubmitButton(modeHint).classList.add("is-loading");
  }
}

function clearAuthNotice() {
  authErrorEl.textContent = "";
  authErrorEl.classList.add("hidden");
  authErrorEl.classList.remove("auth-notice-error", "auth-notice-info", "auth-notice-success");
}

function showAuthState({
  eyebrow = "Action Complete",
  title = "",
  message = "",
  detail = "",
  primaryLabel = "Continue",
  secondaryLabel = "",
  onPrimary = null,
  onSecondary = null,
} = {}) {
  clearAuthSuccessTimer();
  authStage.classList.add("state-active");
  authStateCard.classList.remove("hidden");
  authStateEyebrow.textContent = eyebrow;
  authStateTitle.textContent = title;
  authStateMessage.textContent = message;
  authStateDetail.textContent = detail;
  authStateDetail.classList.toggle("hidden", !detail);
  authStatePrimary.textContent = primaryLabel;
  authStateSecondary.textContent = secondaryLabel;
  authStateSecondary.classList.toggle("hidden", !secondaryLabel);
  authStatePrimaryHandler = onPrimary;
  authStateSecondaryHandler = onSecondary;
}

function hideAuthState() {
  authStage.classList.remove("state-active");
  authStateCard.classList.add("hidden");
  authStateEyebrow.textContent = "Action Complete";
  authStateTitle.textContent = "";
  authStateMessage.textContent = "";
  authStateDetail.textContent = "";
  authStateDetail.classList.add("hidden");
  authStatePrimary.textContent = "Continue";
  authStateSecondary.textContent = "";
  authStateSecondary.classList.add("hidden");
  authStatePrimaryHandler = null;
  authStateSecondaryHandler = null;
}

function clearAuthSuccessTimer() {
  if (authSuccessTimer) {
    window.clearTimeout(authSuccessTimer);
    authSuccessTimer = null;
  }
}

function setAuthNotice(message, type = "error") {
  authErrorEl.textContent = message;
  authErrorEl.classList.toggle("hidden", !message);
  authErrorEl.classList.remove("auth-notice-error", "auth-notice-info", "auth-notice-success");
  if (!message) {
    return;
  }
  if (type === "success") {
    authErrorEl.classList.add("auth-notice-success");
    return;
  }
  if (type === "info") {
    authErrorEl.classList.add("auth-notice-info");
    return;
  }
  authErrorEl.classList.add("auth-notice-error");
}

function getResetTokenFromLocation() {
  return new URLSearchParams(location.search).get("token") || "";
}

function getVerificationEmailFromLocation() {
  return new URLSearchParams(location.search).get("email") || "";
}

function syncVerificationEmailField(email = "") {
  const field = document.getElementById("verify-email");
  if (!field) {
    return;
  }
  const resolved = email || pendingVerificationEmail || getVerificationEmailFromLocation();
  if (resolved) {
    field.value = resolved;
    pendingVerificationEmail = resolved;
  }
}

function animateAuthStage() {
  authStage.classList.remove("mode-animating");
  void authStage.offsetWidth;
  authStage.classList.add("mode-animating");
}

function togglePasswordVisibility(button) {
  const targetId = button.dataset.target;
  if (!targetId) {
    return;
  }
  const input = document.getElementById(targetId);
  if (!input) {
    return;
  }
  const nextVisible = input.type === "password";
  input.type = nextVisible ? "text" : "password";
  button.classList.toggle("is-visible", nextVisible);
  button.setAttribute("aria-label", nextVisible ? "Hide password" : "Show password");
  const hiddenLabel = button.querySelector(".visually-hidden");
  if (hiddenLabel) {
    hiddenLabel.textContent = nextVisible ? "Hide password" : "Show password";
  }
}

function resetPasswordToggles() {
  passwordToggles.forEach((button) => {
    const targetId = button.dataset.target;
    if (!targetId) {
      return;
    }
    const input = document.getElementById(targetId);
    if (input) {
      input.type = "password";
    }
    button.classList.remove("is-visible");
    button.setAttribute("aria-label", "Show password");
    const hiddenLabel = button.querySelector(".visually-hidden");
    if (hiddenLabel) {
      hiddenLabel.textContent = "Show password";
    }
  });
}

function syncModeButtons() {
  const busy = !isAuthenticated || authBusy || Boolean(activeSocket || activeController);
  dashboardNavButtons.forEach((button) => {
    button.disabled = busy;
  });
  commandPanelButtons.forEach((button) => {
    button.disabled = busy;
  });
  sidebarToggle.disabled = busy;
  commandRun.disabled = busy || !isAuthenticated;
}

function updateAlertProtocolUI() {
  const isTCP = alertProtocol.value === "tcpping";
  alertPortField.classList.toggle("hidden", !isTCP);
}

function prefillAlertRuleFromCurrentTarget() {
  alertProtocol.value = currentMode === "tcpping" ? "tcpping" : "ping";
  updateAlertProtocolUI();
  alertTarget.value = document.getElementById("host").value.trim();
  if (alertProtocol.value === "tcpping") {
    alertPort.value = portField.value || "443";
  }
  if (!alertName.value) {
    alertName.value = buildDefaultAlertName();
  }
}

function buildDefaultAlertName() {
  const protocol = alertProtocol.value === "tcpping" ? "TCP" : "ICMP";
  const target = alertTarget.value.trim() || document.getElementById("host").value.trim() || "target";
  if (alertProtocol.value === "tcpping") {
    return `${protocol} ${target}:${alertPort.value || "443"}`;
  }
  return `${protocol} ${target}`;
}

async function saveAlertRule() {
  if (!isAuthenticated) {
    return;
  }

  clearAlertsNotice();
  const payload = {
    name: alertName.value.trim(),
    protocol: alertProtocol.value,
    target: alertTarget.value.trim(),
    port: Number(alertPort.value || 0),
    recipient_email: alertEmail.value.trim(),
    latency_threshold_ms: Number(alertLatencyThreshold.value || 0),
    loss_threshold_percent: Number(alertLossThreshold.value || 0),
    consecutive_breaches: Number(alertConsecutive.value || 1),
    cooldown_minutes: Number(alertCooldown.value || 30),
    notify_on_recovery: alertRecovery.checked,
    enabled: true,
  };

  try {
    const res = await fetch("/api/alerts/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) {
      throw new Error(data.error || "Unable to save alert rule");
    }
    alertForm.reset();
    alertProtocol.value = "ping";
    alertConsecutive.value = "1";
    alertCooldown.value = "30";
    alertRecovery.checked = true;
    if (currentUser?.email) {
      alertEmail.value = currentUser.email;
    }
    updateAlertProtocolUI();
    setAlertsNotice(`Rule saved for ${data.target}.`, "success");
    await loadAlertRules();
    applyDashboardPanel("alerts");
  } catch (err) {
    setAlertsNotice(err.message, "error");
  }
}

async function loadAlertRules() {
  if (!isAuthenticated) {
    return;
  }
  try {
    const res = await fetch("/api/alerts/rules");
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to load alert rules");
    }
    renderAlertRules(Array.isArray(data) ? data : []);
  } catch (err) {
    setAlertsNotice(err.message, "error");
  }
}

function renderAlertRules(rules) {
  alertRulesCache = Array.isArray(rules) ? [...rules] : [];
  alertRuleCount = rules.length;
  alertsList.innerHTML = "";
  alertsCount.textContent = `${rules.length} rule${rules.length === 1 ? "" : "s"}`;
  alertsEmpty.classList.toggle("hidden", rules.length > 0);
  alertsList.classList.toggle("hidden", rules.length === 0);
  updateOverviewCards();

  rules.forEach((rule) => {
    const card = document.createElement("article");
    card.className = "alert-rule-card";

    const head = document.createElement("div");
    head.className = "alert-rule-head";

    const copy = document.createElement("div");
    const title = document.createElement("h4");
    title.className = "alert-rule-title";
    title.textContent = rule.name || `${rule.protocol} ${rule.target}`;

    const subtitle = document.createElement("div");
    subtitle.className = "alert-rule-subtitle";
    subtitle.textContent = rule.protocol === "tcpping" && rule.port
      ? `TCP Ping - ${rule.target}:${rule.port}`
      : `ICMP Ping - ${rule.target}`;

    copy.appendChild(title);
    copy.appendChild(subtitle);

    const stateBadge = document.createElement("span");
    stateBadge.className = `alert-badge ${rule.last_state === "alert" ? "state-alert" : "state-healthy"}`;
    stateBadge.textContent = rule.last_state === "alert" ? "Alerting" : "Healthy";

    head.appendChild(copy);
    head.appendChild(stateBadge);

    const badges = document.createElement("div");
    badges.className = "alert-rule-badges";

    if (typeof rule.latency_threshold_ms === "number") {
      const badge = document.createElement("span");
      badge.className = "alert-badge";
      badge.textContent = `Latency >= ${rule.latency_threshold_ms}ms`;
      badges.appendChild(badge);
    }
    if (typeof rule.loss_threshold_percent === "number") {
      const badge = document.createElement("span");
      badge.className = "alert-badge";
      badge.textContent = `Loss >= ${rule.loss_threshold_percent}%`;
      badges.appendChild(badge);
    }
    const streakBadge = document.createElement("span");
    streakBadge.className = "alert-badge";
    streakBadge.textContent = `${rule.consecutive_breaches}x breach`;
    badges.appendChild(streakBadge);

    const meta = document.createElement("div");
    meta.className = "alert-rule-meta";
    meta.textContent = `Recipient: ${rule.recipient_email} - Cooldown: ${rule.cooldown_minutes}m - Recovery: ${rule.notify_on_recovery ? "on" : "off"}`;

    const summary = document.createElement("div");
    summary.className = "alert-rule-summary";
    if (rule.last_triggered_at) {
      summary.textContent = `Last alert: ${formatTimestamp(rule.last_triggered_at)}`;
    } else {
      summary.textContent = "No alert fired yet.";
    }

    const actions = document.createElement("div");
    actions.className = "alert-rule-actions";
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "secondary";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteAlertRule(rule.id));
    actions.appendChild(deleteBtn);

    card.appendChild(head);
    card.appendChild(badges);
    card.appendChild(meta);
    card.appendChild(summary);
    card.appendChild(actions);
    alertsList.appendChild(card);
  });
}

async function deleteAlertRule(ruleID) {
  if (!isAuthenticated || !ruleID) {
    return;
  }
  clearAlertsNotice();
  try {
    const res = await fetch(`/api/alerts/rules?id=${encodeURIComponent(ruleID)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) {
      throw new Error(data.error || "Unable to delete alert rule");
    }
    setAlertsNotice("Rule deleted.", "success");
    await loadAlertRules();
  } catch (err) {
    setAlertsNotice(err.message, "error");
  }
}

function setAlertsNotice(message, type = "info") {
  alertsNotice.textContent = message;
  alertsNotice.classList.toggle("hidden", !message);
  alertsNotice.classList.remove("auth-notice-error", "auth-notice-info", "auth-notice-success");
  if (!message) {
    return;
  }
  if (type === "success") {
    alertsNotice.classList.add("auth-notice-success");
    return;
  }
  if (type === "error") {
    alertsNotice.classList.add("auth-notice-error");
    return;
  }
  alertsNotice.classList.add("auth-notice-info");
}

function clearAlertsNotice() {
  setAlertsNotice("");
}

function setSettingsNotice(message, type = "info") {
  settingsNotice.textContent = message;
  settingsNotice.classList.toggle("hidden", !message);
  settingsNotice.classList.remove("auth-notice-error", "auth-notice-info", "auth-notice-success");
  if (!message) {
    return;
  }
  if (type === "success") {
    settingsNotice.classList.add("auth-notice-success");
    return;
  }
  if (type === "error") {
    settingsNotice.classList.add("auth-notice-error");
    return;
  }
  settingsNotice.classList.add("auth-notice-info");
}

function setProfileNotice(message, type = "info") {
  profileNotice.textContent = message;
  profileNotice.classList.toggle("hidden", !message);
  profileNotice.classList.remove("auth-notice-error", "auth-notice-info", "auth-notice-success");
  if (!message) {
    return;
  }
  if (type === "success") {
    profileNotice.classList.add("auth-notice-success");
    return;
  }
  if (type === "error") {
    profileNotice.classList.add("auth-notice-error");
    return;
  }
  profileNotice.classList.add("auth-notice-info");
}

function syncHostFields(value, source = "form") {
  const normalized = value ?? "";
  if (source !== "form" && hostField.value !== normalized) {
    hostField.value = normalized;
  }
  if (source !== "command" && commandTarget.value !== normalized) {
    commandTarget.value = normalized;
  }
  updateOverviewCards();
}

function updateCommandBar() {
  const modeLabels = {
    ping: "ICMP Ping",
    tcpping: "TCP Ping",
    portscan: "Port Scan",
    history: "History",
    alerts: "Alert Rules",
    settings: "Settings",
    profile: "Profile",
  };
  commandModePill.textContent = modeLabels[currentPanel] || "ICMP Ping";
  commandPanelButtons.forEach((button) => {
    button.classList.toggle("active", (button.dataset.panel || "ping") === currentPanel);
  });
}

function preferredTargetValue() {
  return commandTarget.value.trim() || hostField.value.trim();
}

function normalizeTargetKey(target) {
  return (target || "").trim().toLowerCase();
}

function syncDashboardContext({ target = "", mode = "", port = null } = {}) {
  if (target) {
    syncHostFields(target, "command");
  }
  if (mode === "ping" || mode === "tcpping" || mode === "portscan") {
    currentMode = mode;
  }
  if (typeof port === "number" && Number.isFinite(port) && port > 0) {
    portField.value = String(port);
  }
}

function navigateToDashboardPanel(panel, options = {}) {
  const { target = "", mode = "", port = null, useCurrentTarget = false, smooth = true } = options;
  if (!isAuthenticated) {
    return;
  }

  const resolvedTarget = target || (useCurrentTarget ? preferredTargetValue() : "");
  syncDashboardContext({
    target: resolvedTarget,
    mode,
    port,
  });
  applyDashboardPanel(panel, { pushHistory: true, smooth });
}

function updateOverviewClock() {
  const now = new Date();
  const timeText = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  overviewClock.textContent = `${timeText} UTC+6`;
}

function modeLabel(mode) {
  switch (mode) {
    case "tcpping":
      return "TCP Ping";
    case "portscan":
      return "Port Scan";
    case "history":
      return "History";
    case "alerts":
      return "Alert Rules";
    case "settings":
      return "Settings";
    case "profile":
      return "Profile";
    default:
      return "ICMP Ping";
  }
}

function protocolLabel(mode, protocol = "") {
  if (protocol === "tcp-portscan") {
    return "tcp-portscan";
  }
  if (protocol && typeof protocol === "string") {
    return protocol;
  }
  if (mode === "tcpping") {
    return "tcp-handshake";
  }
  if (mode === "portscan") {
    return "tcp-portscan";
  }
  return "icmp-echo";
}

function numericRttValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace("ms", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function shortClock(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "--:--:--";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function medianValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function prepareCanvas(canvas, ctx) {
  if (!canvas || !ctx) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width === 0 || height === 0) {
    return null;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { width, height };
}

function captureOverviewSignalSnapshot(cards) {
  const snapshot = {
    ts: Date.now(),
    critical: cards.filter((card) => card.state === "error").length,
    warning: cards.filter((card) => card.state === "warning").length,
    healthy: cards.filter((card) => card.state === "healthy").length,
    running: cards.filter((card) => card.state === "running").length,
  };
  const previous = overviewSignalHistory[overviewSignalHistory.length - 1];
  const changed = !previous
    || previous.critical !== snapshot.critical
    || previous.warning !== snapshot.warning
    || previous.healthy !== snapshot.healthy
    || previous.running !== snapshot.running;
  if (!changed && previous && snapshot.ts - previous.ts < 1800) {
    return;
  }
  overviewSignalHistory.push(snapshot);
  if (overviewSignalHistory.length > 48) {
    overviewSignalHistory.shift();
  }
}

function closeUserDropdown() {
  userDropdown.classList.add("hidden");
  userMenuToggle.setAttribute("aria-expanded", "false");
}

function toggleUserDropdown(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean"
    ? forceOpen
    : userDropdown.classList.contains("hidden");
  userDropdown.classList.toggle("hidden", !shouldOpen);
  userMenuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

function refreshSidebarGroupState() {
  sidebarGroups.forEach((group) => {
    const hasActive = Boolean(group.querySelector(".dashboard-nav-button.active"));
    group.classList.toggle("has-active", hasActive);
    if (hasActive) {
      group.classList.add("is-open");
      const toggle = group.querySelector(".sidebar-group-toggle");
      const body = group.querySelector(".sidebar-group-body");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
      }
      if (body) {
        body.classList.remove("hidden");
      }
    }
  });
}

function terminalStateClass(state) {
  switch (state) {
    case "running":
      return "terminal-state-badge terminal-state-running";
    case "healthy":
      return "terminal-state-badge terminal-state-healthy";
    case "warning":
      return "terminal-state-badge terminal-state-warning";
    case "error":
      return "terminal-state-badge terminal-state-error";
    default:
      return "terminal-state-badge terminal-state-idle";
  }
}

function setTerminalStateBadge(element, label, state) {
  if (!element) {
    return;
  }
  element.textContent = label;
  element.className = terminalStateClass(state);
}

function resetTerminalTelemetry(mode = currentMode) {
  terminalTelemetryState.target = "-";
  terminalTelemetryState.mode = modeLabel(mode);
  terminalTelemetryState.protocol = protocolLabel(mode);
  terminalTelemetryState.updatedAt = 0;
  terminalTelemetryState.events = 0;
  terminalTelemetryState.signal = "idle";
  terminalTelemetryState.feedState = "cold";
  terminalTelemetryState.lastRTT = "-";
  terminalTelemetryState.state = "idle";
  terminalEventStamp.textContent = "--:--:--";
  terminalEventTitle.textContent = "Awaiting telemetry";
  terminalEventCopy.textContent = "Run a probe to stream live events and state changes into this rail.";
  updateTerminalTelemetry();
  setTerminalStateBadge(terminalSummaryState, "idle", "idle");
}

function updateTerminalTelemetry() {
  terminalRunTarget.textContent = terminalTelemetryState.target || "-";
  terminalRunMode.textContent = terminalTelemetryState.mode;
  terminalRunProtocol.textContent = terminalTelemetryState.protocol;
  terminalRunUpdated.textContent = terminalTelemetryState.updatedAt ? shortClock(terminalTelemetryState.updatedAt) : "Awaiting run";
  terminalStatEvents.textContent = String(terminalTelemetryState.events);
  terminalStatSignal.textContent = terminalTelemetryState.signal;
  terminalStatLast.textContent = terminalTelemetryState.lastRTT || "-";
  terminalStatFeed.textContent = terminalTelemetryState.feedState;
  setTerminalStateBadge(terminalRunState, terminalTelemetryState.state, terminalTelemetryState.state);
}

function setTerminalRunContext(mode, payload, protocol = "") {
  terminalTelemetryState.target = mode === "tcpping" && payload.port ? `${payload.host}:${payload.port}` : payload.host || "-";
  terminalTelemetryState.mode = modeLabel(mode);
  terminalTelemetryState.protocol = protocolLabel(mode, protocol);
  terminalTelemetryState.updatedAt = Date.now();
  terminalTelemetryState.events = 0;
  terminalTelemetryState.signal = "arming";
  terminalTelemetryState.feedState = "warming";
  terminalTelemetryState.lastRTT = "-";
  terminalTelemetryState.state = "running";
  terminalEventStamp.textContent = shortClock(terminalTelemetryState.updatedAt);
  terminalEventTitle.textContent = "Run initialized";
  terminalEventCopy.textContent = `${terminalTelemetryState.mode} armed for ${terminalTelemetryState.target}. Waiting for live telemetry.`;
  updateTerminalTelemetry();
  setTerminalStateBadge(terminalSummaryState, "arming", "running");
}

function pushSOCEvent(title, copy, tone = "info") {
  socTelemetryFeed.unshift({
    title,
    copy,
    tone,
    ts: Date.now(),
  });
  if (socTelemetryFeed.length > 8) {
    socTelemetryFeed.pop();
  }
}

function updateTerminalEvent(title, copy, state, lastRTT = null, feedState = null, signal = null) {
  terminalTelemetryState.events += 1;
  terminalTelemetryState.updatedAt = Date.now();
  terminalTelemetryState.state = state || terminalTelemetryState.state;
  if (signal) {
    terminalTelemetryState.signal = signal;
  }
  if (feedState) {
    terminalTelemetryState.feedState = feedState;
  }
  if (lastRTT) {
    terminalTelemetryState.lastRTT = lastRTT;
  }
  terminalEventStamp.textContent = shortClock(terminalTelemetryState.updatedAt);
  terminalEventTitle.textContent = title;
  terminalEventCopy.textContent = copy;
  updateTerminalTelemetry();
  setTerminalStateBadge(terminalSummaryState, terminalTelemetryState.state, terminalTelemetryState.state);
}

function renderSOCFeed() {
  telemetryFeed.innerHTML = "";
  if (socTelemetryFeed.length === 0) {
    telemetryFeed.innerHTML = `
      <article class="telemetry-feed-item">
        <div class="telemetry-feed-head">
          <strong>Feed idle</strong>
          <span>Awaiting</span>
        </div>
        <p class="telemetry-feed-copy">Diagnostics, alerts, and run state changes will stream into this feed.</p>
      </article>
    `;
    protocolSummaryPill.textContent = "Idle feed";
    protocolSummaryPill.className = "command-pill command-pill-muted";
    return;
  }

  const latestTone = socTelemetryFeed[0].tone;
  protocolSummaryPill.textContent = `${socTelemetryFeed.length} event${socTelemetryFeed.length === 1 ? "" : "s"} buffered`;
  protocolSummaryPill.className = latestTone === "error"
    ? "command-pill command-pill-unhealthy"
    : latestTone === "warning"
      ? "command-pill"
      : "command-pill command-pill-healthy";

  socTelemetryFeed.forEach((item) => {
    const article = document.createElement("article");
    article.className = `telemetry-feed-item ${item.tone ? `feed-${item.tone}` : ""}`;
    article.innerHTML = `
      <div class="telemetry-feed-head">
        <strong>${item.title}</strong>
        <span>${shortClock(item.ts)}</span>
      </div>
      <p class="telemetry-feed-copy">${item.copy}</p>
    `;
    telemetryFeed.appendChild(article);
  });
}

function buildIncidentEntries(cards) {
  const entries = [];
  const monitorByKey = new Map();

  cards.forEach((card) => {
    const key = monitorKeyFor(card.mode, normalizeTargetKey(card.target), card.port || 0);
    monitorByKey.set(key, card);
  });

  alertRulesCache.forEach((rule) => {
    const monitorKey = monitorKeyFor(rule.protocol || "ping", normalizeTargetKey(rule.target), rule.port || 0);
    const matchingCard = monitorByKey.get(monitorKey);
    const isAlerting = rule.last_state === "alert";
    const severity = matchingCard?.state === "error"
      ? "critical"
      : matchingCard?.state === "warning" || isAlerting
        ? "warning"
        : "healthy";
    const targetLabel = rule.protocol === "tcpping" && rule.port
      ? `${rule.target}:${rule.port}`
      : rule.target;
    const when = rule.last_triggered_at || rule.last_evaluated_at || rule.created_at || "";
    entries.push({
      key: `rule-${rule.id}`,
      title: rule.name || targetLabel,
      target: targetLabel,
      severity,
      summary: isAlerting
        ? `Rule alerting with streak ${rule.current_breach_streak || 0}/${rule.consecutive_breaches || 1}.`
        : "Rule armed and awaiting breach telemetry.",
      stamp: when ? formatRelativeTime(new Date(when).getTime()) : "armed",
      panel: "alerts",
      mode: rule.protocol || "ping",
      port: rule.port || 0,
      targetValue: rule.target || "",
      sortRank: isAlerting ? 4 : matchingCard?.state === "warning" ? 3 : 1,
      ts: when ? new Date(when).getTime() : 0,
    });
  });

  cards.forEach((card) => {
    if (card.state !== "error" && card.state !== "warning" && card.state !== "running") {
      return;
    }
    entries.push({
      key: `monitor-${card.key}`,
      title: card.target || "-",
      target: card.mode === "tcpping" && card.port ? `${card.target}:${card.port}` : card.target,
      severity: card.state === "error" ? "critical" : card.state === "warning" ? "warning" : "running",
      summary: card.summaryText || card.statusText || "Live telemetry is active.",
      stamp: formatRelativeTime(card.updatedAt),
      panel: card.state === "running" ? card.mode : "history",
      mode: card.mode,
      port: card.port || 0,
      targetValue: card.target || "",
      sortRank: card.state === "error" ? 5 : card.state === "warning" ? 4 : 2,
      ts: card.updatedAt || 0,
    });
  });

  return entries
    .sort((a, b) => {
      if (b.sortRank !== a.sortRank) {
        return b.sortRank - a.sortRank;
      }
      return (b.ts || 0) - (a.ts || 0);
    })
    .slice(0, 5);
}

function renderIncidentHotlist(cards) {
  if (!incidentHotlist) {
    return;
  }
  incidentHotlist.innerHTML = "";
  const entries = buildIncidentEntries(cards);
  if (entries.length === 0) {
    incidentHotlist.innerHTML = `
      <div class="incident-hotlist-empty">
        <strong>No live incidents</strong>
        <span>Alert pressure and unstable targets will surface here.</span>
      </div>
    `;
    return;
  }

  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `incident-hotlist-item incident-hotlist-${entry.severity}`;
    button.innerHTML = `
      <div class="incident-hotlist-copy">
        <strong>${entry.title}</strong>
        <span>${entry.summary}</span>
      </div>
      <div class="incident-hotlist-meta">
        <span class="incident-hotlist-target">${entry.target}</span>
        <small>${entry.stamp}</small>
      </div>
    `;
    button.addEventListener("click", () => {
      navigateToDashboardPanel(entry.panel, {
        target: entry.targetValue,
        mode: entry.mode,
        port: entry.port,
        smooth: false,
      });
    });
    incidentHotlist.appendChild(button);
  });
}

function renderProtocolBars(cards) {
  const buckets = [
    { mode: "ping", label: "ICMP Ping" },
    { mode: "tcpping", label: "TCP Ping" },
    { mode: "portscan", label: "Port Scan" },
  ];
  const total = cards.length || 1;
  protocolBars.innerHTML = "";

  buckets.forEach((bucket) => {
    const matches = cards.filter((card) => card.mode === bucket.mode);
    const width = matches.length === 0 ? 0 : Math.max(10, Math.round((matches.length / total) * 100));
    const strongestState = matches.some((card) => card.state === "error")
      ? "critical"
      : matches.some((card) => card.state === "warning")
        ? "warning"
        : matches.some((card) => card.state === "healthy")
          ? "stable"
          : matches.some((card) => card.state === "running")
            ? "streaming"
            : "idle";
    const article = document.createElement("article");
    article.className = "protocol-bar";
    article.dataset.mode = bucket.mode;
    article.innerHTML = `
      <div class="protocol-bar-head">
        <span>${bucket.label}</span>
        <strong>${matches.length} · ${strongestState}</strong>
      </div>
      <div class="protocol-bar-track">
        <span style="width:${width}%"></span>
      </div>
    `;
    protocolBars.appendChild(article);
  });
}

function renderProtocolDonut(cards) {
  const prepared = prepareCanvas(protocolDonutChart, protocolDonutCtx);
  if (!prepared) {
    return;
  }

  const { width, height } = prepared;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 12;
  const lineWidth = Math.max(12, Math.min(24, radius * 0.34));
  const buckets = [
    { mode: "ping", value: cards.filter((card) => card.mode === "ping").length, color: "#22d3ee", label: "ICMP" },
    { mode: "tcpping", value: cards.filter((card) => card.mode === "tcpping").length, color: "#60a5fa", label: "TCP" },
    { mode: "portscan", value: cards.filter((card) => card.mode === "portscan").length, color: "#c084fc", label: "Scan" },
  ];
  const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0);

  protocolDonutCtx.strokeStyle = "rgba(31, 41, 55, 0.96)";
  protocolDonutCtx.lineWidth = lineWidth;
  protocolDonutCtx.beginPath();
  protocolDonutCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  protocolDonutCtx.stroke();

  if (total > 0) {
    let start = -Math.PI / 2;
    buckets.forEach((bucket) => {
      if (!bucket.value) {
        return;
      }
      const arc = (bucket.value / total) * Math.PI * 2;
      protocolDonutCtx.strokeStyle = bucket.color;
      protocolDonutCtx.lineCap = "round";
      protocolDonutCtx.lineWidth = lineWidth;
      protocolDonutCtx.beginPath();
      protocolDonutCtx.arc(centerX, centerY, radius, start, start + arc);
      protocolDonutCtx.stroke();
      start += arc;
    });
  }

  protocolDonutCtx.fillStyle = "#eef6ff";
  protocolDonutCtx.font = "700 28px 'Space Grotesk', sans-serif";
  protocolDonutCtx.textAlign = "center";
  protocolDonutCtx.textBaseline = "middle";
  protocolDonutCtx.fillText(String(total), centerX, centerY - 6);
  protocolDonutCtx.fillStyle = "rgba(148, 163, 184, 0.92)";
  protocolDonutCtx.font = "600 11px 'Space Grotesk', sans-serif";
  protocolDonutCtx.fillText(total === 1 ? "active tool" : "active tools", centerX, centerY + 18);

  protocolDonutCtx.textAlign = "left";
  protocolDonutCtx.textBaseline = "alphabetic";
  let legendY = height - 8;
  const legendX = 12;
  buckets.forEach((bucket) => {
    protocolDonutCtx.fillStyle = bucket.color;
    protocolDonutCtx.fillRect(legendX, legendY - 8, 10, 10);
    protocolDonutCtx.fillStyle = "rgba(214, 229, 247, 0.92)";
    protocolDonutCtx.font = "600 11px 'Space Grotesk', sans-serif";
    protocolDonutCtx.fillText(`${bucket.label} ${bucket.value}`, legendX + 16, legendY);
    legendY -= 18;
  });
}

function renderOverviewHealthDonut(cards) {
  const prepared = prepareCanvas(overviewHealthDonut, overviewHealthDonutCtx);
  if (!prepared) {
    return;
  }

  const { width, height } = prepared;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 16;
  const lineWidth = Math.max(14, Math.min(28, radius * 0.34));
  const segments = [
    { label: "Critical", value: cards.filter((card) => card.state === "error").length, color: "#f87171" },
    { label: "Warning", value: cards.filter((card) => card.state === "warning").length, color: "#f59e0b" },
    { label: "Stable", value: cards.filter((card) => card.state === "healthy").length, color: "#4ade80" },
    { label: "Streaming", value: cards.filter((card) => card.state === "running").length, color: "#22d3ee" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  overviewHealthDonutCtx.strokeStyle = "rgba(31, 41, 55, 0.96)";
  overviewHealthDonutCtx.lineWidth = lineWidth;
  overviewHealthDonutCtx.beginPath();
  overviewHealthDonutCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  overviewHealthDonutCtx.stroke();

  if (total > 0) {
    let start = -Math.PI / 2;
    segments.forEach((segment) => {
      if (!segment.value) {
        return;
      }
      const arc = (segment.value / total) * Math.PI * 2;
      overviewHealthDonutCtx.strokeStyle = segment.color;
      overviewHealthDonutCtx.lineCap = "round";
      overviewHealthDonutCtx.lineWidth = lineWidth;
      overviewHealthDonutCtx.beginPath();
      overviewHealthDonutCtx.arc(centerX, centerY, radius, start, start + arc);
      overviewHealthDonutCtx.stroke();
      start += arc;
    });
  }

  overviewHealthDonutCtx.fillStyle = "#eef6ff";
  overviewHealthDonutCtx.font = "700 28px 'Space Grotesk', sans-serif";
  overviewHealthDonutCtx.textAlign = "center";
  overviewHealthDonutCtx.textBaseline = "middle";
  overviewHealthDonutCtx.fillText(String(total), centerX, centerY - 8);
  overviewHealthDonutCtx.fillStyle = "rgba(148, 163, 184, 0.92)";
  overviewHealthDonutCtx.font = "600 11px 'Space Grotesk', sans-serif";
  overviewHealthDonutCtx.fillText(total === 1 ? "active target" : "active targets", centerX, centerY + 18);

  overviewHealthDonutCtx.textAlign = "left";
  let legendY = height - 10;
  const legendX = 12;
  [...segments].reverse().forEach((segment) => {
    overviewHealthDonutCtx.fillStyle = segment.color;
    overviewHealthDonutCtx.fillRect(legendX, legendY - 8, 10, 10);
    overviewHealthDonutCtx.fillStyle = "rgba(214, 229, 247, 0.92)";
    overviewHealthDonutCtx.font = "600 11px 'Space Grotesk', sans-serif";
    overviewHealthDonutCtx.fillText(`${segment.label} ${segment.value}`, legendX + 16, legendY);
    legendY -= 18;
  });
}

function renderRuntimeSummaryChart() {
  const prepared = prepareCanvas(runtimeSummaryChart, runtimeSummaryCtx);
  if (!prepared) {
    return;
  }

  const { width, height } = prepared;
  const segments = [
    { label: "DB", ok: runtimeHealth.database, color: "#22c55e" },
    { label: "Redis", ok: runtimeHealth.redis, color: "#38bdf8" },
    { label: "Object", ok: runtimeHealth.objectStorage, color: "#c084fc" },
    { label: "Session", ok: runtimeHealth.session, color: "#f59e0b" },
  ];
  const gap = 16;
  const barWidth = Math.max(18, (width - gap * (segments.length + 1)) / segments.length);
  const baseY = height - 26;

  segments.forEach((segment, index) => {
    const x = gap + index * (barWidth + gap);
    const level = segment.ok === null ? 0.22 : segment.ok ? 0.9 : 0.42;
    const barHeight = Math.max(18, level * (height - 48));
    const y = baseY - barHeight;
    runtimeSummaryCtx.fillStyle = "rgba(20, 28, 40, 0.96)";
    runtimeSummaryCtx.fillRect(x, 12, barWidth, height - 38);
    runtimeSummaryCtx.fillStyle = segment.ok === null ? "rgba(148, 163, 184, 0.76)" : segment.ok ? segment.color : "#f87171";
    runtimeSummaryCtx.fillRect(x, y, barWidth, barHeight);
    runtimeSummaryCtx.fillStyle = "rgba(214, 229, 247, 0.92)";
    runtimeSummaryCtx.font = "600 11px 'Space Grotesk', sans-serif";
    runtimeSummaryCtx.textAlign = "center";
    runtimeSummaryCtx.fillText(segment.label, x + barWidth / 2, height - 8);
  });
}

function renderOverviewTargetsTable(cards) {
  if (!overviewTargetsBody) {
    return;
  }
  overviewTargetsBody.innerHTML = "";
  const topCards = [...cards]
    .sort((a, b) => {
      const rank = { error: 4, warning: 3, running: 2, healthy: 1, idle: 0 };
      const diff = (rank[b.state] || 0) - (rank[a.state] || 0);
      if (diff !== 0) {
        return diff;
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    })
    .slice(0, 6);

  if (topCards.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" class="overview-targets-empty">No live targets yet.</td>`;
    overviewTargetsBody.appendChild(tr);
    return;
  }

  topCards.forEach((card) => {
    const tr = document.createElement("tr");
    const targetLabel = card.mode === "tcpping" && card.port ? `${card.target}:${card.port}` : card.target;
    tr.innerHTML = `
      <td>${targetLabel || "-"}</td>
      <td>${modeLabel(card.mode)}</td>
      <td><span class="${monitorStateClass(card.state)}">${card.state}</span></td>
      <td>${card.lastRTT || "-"}</td>
    `;
    tr.addEventListener("click", () => {
      navigateToDashboardPanel(card.state === "error" || card.state === "warning" ? "history" : card.mode, {
        target: card.target,
        mode: card.mode,
        port: card.port || 0,
        smooth: false,
      });
    });
    overviewTargetsBody.appendChild(tr);
  });
}

function renderIncidentTimeline() {
  const prepared = prepareCanvas(incidentTimelineChart, incidentTimelineCtx);
  if (!prepared) {
    return;
  }
  const { width, height } = prepared;
  const samples = overviewSignalHistory.slice(-24);
  incidentTimelineCtx.fillStyle = "rgba(7, 12, 19, 0.96)";
  incidentTimelineCtx.fillRect(0, 0, width, height);

  if (samples.length === 0) {
    incidentTimelineCtx.fillStyle = "rgba(148, 163, 184, 0.72)";
    incidentTimelineCtx.font = "12px 'Space Grotesk', sans-serif";
    incidentTimelineCtx.fillText("No incident samples yet.", 12, 22);
    return;
  }

  const padding = 14;
  const maxValue = Math.max(1, ...samples.map((sample) => sample.critical + sample.warning + sample.running));
  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    incidentTimelineCtx.strokeStyle = "rgba(86, 121, 164, 0.14)";
    incidentTimelineCtx.beginPath();
    incidentTimelineCtx.moveTo(padding, y);
    incidentTimelineCtx.lineTo(width - padding, y);
    incidentTimelineCtx.stroke();
  }

  const drawSeries = (color, getter) => {
    incidentTimelineCtx.beginPath();
    samples.forEach((sample, index) => {
      const x = padding + (index / Math.max(samples.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((getter(sample) / maxValue) * (height - padding * 2));
      if (index === 0) {
        incidentTimelineCtx.moveTo(x, y);
      } else {
        incidentTimelineCtx.lineTo(x, y);
      }
    });
    incidentTimelineCtx.strokeStyle = color;
    incidentTimelineCtx.lineWidth = 2;
    incidentTimelineCtx.stroke();
  };

  drawSeries("#f87171", (sample) => sample.critical);
  drawSeries("#f59e0b", (sample) => sample.warning);
  drawSeries("#22d3ee", (sample) => sample.running);
}

function renderOverviewDensityStrip() {
  const prepared = prepareCanvas(overviewDensityStrip, overviewDensityCtx);
  if (!prepared) {
    return;
  }
  const { width, height } = prepared;
  const samples = overviewSignalHistory.slice(-40);
  overviewDensityCtx.fillStyle = "rgba(7, 12, 19, 0.98)";
  overviewDensityCtx.fillRect(0, 0, width, height);

  if (samples.length === 0) {
    overviewDensityCtx.fillStyle = "rgba(148, 163, 184, 0.72)";
    overviewDensityCtx.font = "12px 'Space Grotesk', sans-serif";
    overviewDensityCtx.fillText("No uptime/loss density yet.", 12, 22);
    return;
  }

  const gap = 3;
  const barWidth = Math.max(4, Math.floor((width - gap * (samples.length - 1)) / samples.length));
  const maxValue = Math.max(1, ...samples.map((sample) => sample.critical + sample.warning + sample.healthy + sample.running));
  samples.forEach((sample, index) => {
    const total = sample.critical + sample.warning + sample.healthy + sample.running || 1;
    const x = index * (barWidth + gap);
    const criticalHeight = (sample.critical / maxValue) * height;
    const warningHeight = (sample.warning / maxValue) * height;
    const runningHeight = (sample.running / maxValue) * height;
    const healthyHeight = (sample.healthy / maxValue) * height;
    let y = height;

    [
      { value: criticalHeight, color: "rgba(248, 113, 113, 0.96)" },
      { value: warningHeight, color: "rgba(245, 158, 11, 0.96)" },
      { value: runningHeight, color: "rgba(34, 211, 238, 0.94)" },
      { value: healthyHeight, color: "rgba(74, 222, 128, 0.96)" },
    ].forEach((segment) => {
      if (segment.value <= 0) {
        return;
      }
      y -= segment.value;
      overviewDensityCtx.fillStyle = segment.color;
      overviewDensityCtx.fillRect(x, y, barWidth, Math.max(3, segment.value));
    });

    if (total === 0) {
      overviewDensityCtx.fillStyle = "rgba(51, 65, 85, 0.9)";
      overviewDensityCtx.fillRect(x, height - 6, barWidth, 6);
    }
  });
}

function renderIncidentPanel(cards) {
  const total = cards.length;
  const critical = cards.filter((card) => card.state === "error").length;
  const warning = cards.filter((card) => card.state === "warning").length;
  const healthy = cards.filter((card) => card.state === "healthy").length;
  const running = cards.filter((card) => card.state === "running").length;
  const denominator = total || 1;
  const criticalPct = (critical / denominator) * 100;
  const warningPct = (warning / denominator) * 100;
  const healthyPct = (healthy / denominator) * 100;
  const runningPct = (running / denominator) * 100;

  incidentTotal.textContent = String(total);
  incidentCriticalCount.textContent = String(critical);
  incidentWarningCount.textContent = String(warning);
  incidentHealthyCount.textContent = String(healthy);
  incidentRunningCount.textContent = String(running);
  incidentCriticalBar.style.width = `${criticalPct}%`;
  incidentWarningBar.style.width = `${warningPct}%`;
  incidentHealthyBar.style.width = `${healthyPct}%`;
  incidentRunningBar.style.width = `${runningPct}%`;

  incidentRing.style.background = `conic-gradient(
    from 180deg,
    rgba(239, 68, 68, 0.92) 0 ${criticalPct}%,
    rgba(245, 158, 11, 0.92) ${criticalPct}% ${criticalPct + warningPct}%,
    rgba(34, 197, 94, 0.92) ${criticalPct + warningPct}% ${criticalPct + warningPct + healthyPct}%,
    rgba(34, 211, 238, 0.92) ${criticalPct + warningPct + healthyPct}% ${criticalPct + warningPct + healthyPct + runningPct}%,
    rgba(30, 41, 59, 0.92) ${criticalPct + warningPct + healthyPct + runningPct}% 100%
  )`;
  incidentRing.dataset.tone = total === 0
    ? "idle"
    : critical > 0
      ? "critical"
      : warning > 0
        ? "warning"
        : running > 0
          ? "running"
          : "healthy";

  if (total === 0) {
    incidentSummaryPill.textContent = "No incidents";
    incidentSummaryPill.className = "command-pill command-pill-muted";
    return;
  }
  if (critical > 0) {
    incidentSummaryPill.textContent = `${critical} critical`;
    incidentSummaryPill.className = "command-pill command-pill-unhealthy";
    return;
  }
  if (warning > 0) {
    incidentSummaryPill.textContent = `${warning} warning`;
    incidentSummaryPill.className = "command-pill";
    return;
  }
  if (running > 0) {
    incidentSummaryPill.textContent = `${running} streaming`;
    incidentSummaryPill.className = "command-pill";
    return;
  }
  incidentSummaryPill.textContent = `${healthy} stable`;
  incidentSummaryPill.className = "command-pill command-pill-healthy";
}

function renderOverviewLatencyStrip() {
  const rect = overviewLatencyStrip.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width === 0 || height === 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  overviewLatencyStrip.width = width * dpr;
  overviewLatencyStrip.height = height * dpr;
  overviewLatencyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overviewLatencyCtx.clearRect(0, 0, width, height);
  overviewLatencyCtx.fillStyle = "rgba(255, 255, 255, 0.02)";
  overviewLatencyCtx.fillRect(0, 0, width, height);

  const values = chartData
    .map((point) => numericRttValue(point.rtt))
    .filter((value) => value !== null)
    .slice(-36);

  if (values.length === 0) {
    overviewLatencyState.textContent = "No samples";
    overviewLatencyState.className = "command-pill command-pill-muted";
    overviewLatencyPeak.textContent = "-";
    overviewLatencyFloor.textContent = "-";
    overviewLatencyMedian.textContent = "-";
    overviewLatencyCtx.fillStyle = "rgba(148, 163, 184, 0.72)";
    overviewLatencyCtx.font = "12px 'Space Grotesk', sans-serif";
    overviewLatencyCtx.fillText("Telemetry timeline is waiting for RTT samples.", 12, 24);
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const median = medianValue(values) || min;
  const range = max - min || 1;
  const paddingX = 8;
  const paddingY = 10;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  for (let i = 0; i < 4; i += 1) {
    const y = paddingY + (chartHeight / 3) * i;
    overviewLatencyCtx.strokeStyle = "rgba(86, 121, 164, 0.16)";
    overviewLatencyCtx.beginPath();
    overviewLatencyCtx.moveTo(paddingX, y);
    overviewLatencyCtx.lineTo(width - paddingX, y);
    overviewLatencyCtx.stroke();
  }

  const points = values.map((value, index) => {
    const x = paddingX + (index / Math.max(values.length - 1, 1)) * chartWidth;
    const y = paddingY + chartHeight - (((value - min) / range) * chartHeight);
    return { x, y, value };
  });

  overviewLatencyCtx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      overviewLatencyCtx.moveTo(point.x, point.y);
      return;
    }
    overviewLatencyCtx.lineTo(point.x, point.y);
  });
  overviewLatencyCtx.lineWidth = 2;
  overviewLatencyCtx.strokeStyle = "rgba(92, 198, 255, 0.94)";
  overviewLatencyCtx.stroke();

  overviewLatencyCtx.lineTo(points[points.length - 1].x, height - paddingY);
  overviewLatencyCtx.lineTo(points[0].x, height - paddingY);
  overviewLatencyCtx.closePath();
  const fillGradient = overviewLatencyCtx.createLinearGradient(0, paddingY, 0, height - paddingY);
  fillGradient.addColorStop(0, "rgba(56, 189, 248, 0.28)");
  fillGradient.addColorStop(1, "rgba(56, 189, 248, 0.02)");
  overviewLatencyCtx.fillStyle = fillGradient;
  overviewLatencyCtx.fill();

  points.forEach((point) => {
    const color = point.value >= median * 2
      ? "#ef4444"
      : point.value >= median * 1.5
        ? "#f59e0b"
        : "#5eead4";
    overviewLatencyCtx.beginPath();
    overviewLatencyCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
    overviewLatencyCtx.fillStyle = color;
    overviewLatencyCtx.fill();
  });

  overviewLatencyPeak.textContent = `${max.toFixed(1)}ms`;
  overviewLatencyFloor.textContent = `${min.toFixed(1)}ms`;
  overviewLatencyMedian.textContent = `${median.toFixed(1)}ms`;

  if (max >= median * 2 && max > 0) {
    overviewLatencyState.textContent = "Spike detected";
    overviewLatencyState.className = "command-pill";
  } else {
    overviewLatencyState.textContent = `${values.length} samples`;
    overviewLatencyState.className = "command-pill command-pill-healthy";
  }
}

function renderOverviewMatrix() {
  const cards = Array.from(liveMonitorMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  overviewMatrix.innerHTML = "";

  const cells = cards.slice(0, 24);
  for (let i = 0; i < 24; i += 1) {
    const card = cells[i];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "overview-matrix-cell";
    if (card) {
      cell.classList.add(`state-${card.state || "idle"}`);
      cell.title = `${card.target} - ${card.statusText}`;
      cell.innerHTML = `<span>${(card.target || "-").slice(0, 10)}</span>`;
      cell.addEventListener("click", () => {
        navigateToDashboardPanel(card.state === "error" || card.state === "warning" ? "history" : card.mode, {
          target: card.target,
          mode: card.mode,
          port: card.port || 0,
          smooth: false,
        });
      });
    } else {
      cell.classList.add("state-empty");
      cell.innerHTML = "<span>idle</span>";
      cell.disabled = true;
    }
    overviewMatrix.appendChild(cell);
  }

  if (cards.length === 0) {
    overviewMatrixSummary.textContent = "Awaiting telemetry";
    overviewMatrixSummary.className = "command-pill command-pill-muted";
    return;
  }

  const errorCount = cards.filter((card) => card.state === "error").length;
  const warningCount = cards.filter((card) => card.state === "warning").length;
  const healthyCount = cards.filter((card) => card.state === "healthy").length;
  if (errorCount > 0) {
    overviewMatrixSummary.textContent = `${errorCount} critical target${errorCount === 1 ? "" : "s"}`;
    overviewMatrixSummary.className = "command-pill command-pill-unhealthy";
  } else if (warningCount > 0) {
    overviewMatrixSummary.textContent = `${warningCount} warning target${warningCount === 1 ? "" : "s"}`;
    overviewMatrixSummary.className = "command-pill";
  } else if (healthyCount > 0) {
    overviewMatrixSummary.textContent = `${healthyCount} healthy target${healthyCount === 1 ? "" : "s"}`;
    overviewMatrixSummary.className = "command-pill command-pill-healthy";
  } else {
    overviewMatrixSummary.textContent = `${cards.length} monitored target${cards.length === 1 ? "" : "s"}`;
    overviewMatrixSummary.className = "command-pill command-pill-muted";
  }
}

function updateOverviewCards() {
  const runtimeLabel = runtimeHealth.ok === null ? "Checking" : runtimeHealth.ok ? "Healthy" : "Degraded";
  kpiRuntimeStatus.textContent = runtimeLabel;
  kpiRuntimeCopy.textContent = runtimeHealth.summary || "Runtime health is loading.";
  runtimeRing.classList.remove("runtime-ring-neutral", "runtime-ring-healthy", "runtime-ring-degraded");
  if (runtimeHealth.ok === null) {
    commandHealthPill.textContent = "Runtime checking";
    commandHealthPill.className = "command-pill command-pill-muted";
    runtimeRing.classList.add("runtime-ring-neutral");
  } else if (runtimeHealth.ok) {
    commandHealthPill.textContent = "Runtime healthy";
    commandHealthPill.className = "command-pill command-pill-healthy";
    runtimeRing.classList.add("runtime-ring-healthy");
  } else {
    commandHealthPill.textContent = "Runtime degraded";
    commandHealthPill.className = "command-pill command-pill-unhealthy";
    runtimeRing.classList.add("runtime-ring-degraded");
  }

  const liveAlertingRules = alertRulesCache.filter((rule) => rule.last_state === "alert").length;
  const healthyRules = Math.max(0, alertRulesCache.length - liveAlertingRules);
  kpiAlertRules.textContent = String(alertRuleCount);
  kpiAlertCopy.textContent = alertRuleCount === 0
    ? "No threshold rules loaded yet."
    : liveAlertingRules > 0
      ? `${liveAlertingRules} rule${liveAlertingRules === 1 ? "" : "s"} actively alerting.`
      : `${healthyRules} armed rule${healthyRules === 1 ? "" : "s"} covering active targets.`;

  const monitorCards = Array.from(liveMonitorMap.values());
  const criticalCount = monitorCards.filter((card) => card.state === "error").length;
  const warningCount = monitorCards.filter((card) => card.state === "warning").length;
  const healthyCount = monitorCards.filter((card) => card.state === "healthy").length;
  const runningCount = monitorCards.filter((card) => card.state === "running").length;
  kpiLiveMonitors.textContent = String(monitorCards.length);
  if (monitorCards.length === 0) {
    kpiMonitorCopy.textContent = "No recent monitor activity.";
  } else {
    const activeCount = monitorCards.filter((card) => card.state === "running").length;
    const unstableCount = monitorCards.filter((card) => card.state === "error" || card.state === "warning").length;
    kpiMonitorCopy.textContent = unstableCount > 0
      ? `${unstableCount} target${unstableCount === 1 ? "" : "s"} unstable in live telemetry.`
      : activeCount > 0
        ? `${activeCount} monitor${activeCount === 1 ? "" : "s"} actively streaming.`
        : "Recent monitor activity is available below.";
  }

  if (lastProbeSnapshot?.rttText) {
    kpiLastRtt.textContent = lastProbeSnapshot.rttText;
    kpiRTTCopy.textContent = lastProbeSnapshot.copy || "Latest telemetry update.";
  } else {
    kpiLastRtt.textContent = "-";
    kpiRTTCopy.textContent = "Awaiting telemetry from a probe.";
  }

  const focusTarget = commandTarget.value.trim() || hostField.value.trim();
  overviewFocusTarget.textContent = focusTarget || "No target selected";
  overviewSessionTag.textContent = isAuthenticated ? "Session active" : "Session locked";
  overviewSessionTag.className = isAuthenticated ? "command-pill command-pill-healthy" : "command-pill command-pill-muted";
  overviewLiveTargets.textContent = String(monitorCards.length);
  overviewLiveTargetsCopy.textContent = monitorCards.length === 0
    ? "Awaiting telemetry"
    : `${runningCount} active · ${healthyCount} stable`;
  overviewCriticalTotal.textContent = String(criticalCount);
  overviewWarningTotal.textContent = String(warningCount);
  overviewStableTotal.textContent = String(healthyCount);
  overviewStreamingTotal.textContent = String(runningCount);
  overviewFeedBuffer.textContent = socTelemetryFeed.length === 0
    ? "0 buffered events"
    : `${socTelemetryFeed.length} buffered event${socTelemetryFeed.length === 1 ? "" : "s"}`;
  if (socTelemetryFeed.length > 0) {
    const latestFeed = socTelemetryFeed[0];
    overviewLastEventTitle.textContent = latestFeed.title;
    overviewLastEventCopy.textContent = latestFeed.copy;
    overviewLastEventStamp.textContent = shortClock(latestFeed.ts);
  } else {
    overviewLastEventTitle.textContent = "No live event yet";
    overviewLastEventCopy.textContent = "Telemetry and incident transitions will appear here.";
    overviewLastEventStamp.textContent = "--:--:--";
  }

  captureOverviewSignalSnapshot(monitorCards);
  updateCommandBar();
  renderOverviewMatrix();
  renderIncidentPanel(monitorCards);
  renderIncidentHotlist(monitorCards);
  renderOverviewHealthDonut(monitorCards);
  renderOverviewTargetsTable(monitorCards);
  renderRuntimeSummaryChart();
  renderProtocolBars(monitorCards);
  renderProtocolDonut(monitorCards);
  renderSOCFeed();
  renderOverviewLatencyStrip();
  renderIncidentTimeline();
  renderOverviewDensityStrip();
}

function monitorStateClass(state) {
  switch (state) {
    case "healthy":
      return "monitor-state monitor-state-healthy";
    case "warning":
      return "monitor-state monitor-state-warning";
    case "error":
      return "monitor-state monitor-state-error";
    case "running":
      return "monitor-state monitor-state-running";
    default:
      return "monitor-state monitor-state-idle";
  }
}

function monitorKeyFor(mode, target, port = 0) {
  return `${mode}:${target || "-"}:${port || 0}`;
}

function ensureMonitorCard(mode, target, port = 0) {
  const key = monitorKeyFor(mode, target, port);
  const existing = liveMonitorMap.get(key);
  if (existing) {
    return existing;
  }
  const card = {
    key,
    mode,
    target,
    port,
    state: "idle",
    lastRTT: "",
    avgText: "-",
    statusText: "Awaiting probes",
    updatedAt: Date.now(),
    summaryText: "No packets recorded yet.",
    spark: [],
  };
  liveMonitorMap.set(key, card);
  return card;
}

function appendMonitorSample(card, value) {
  if (!card) {
    return;
  }
  if (!Array.isArray(card.spark)) {
    card.spark = [];
  }
  card.spark.push(value);
  if (card.spark.length > 18) {
    card.spark = card.spark.slice(-18);
  }
}

function renderMonitorGrid() {
  const cards = Array.from(liveMonitorMap.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  monitorGrid.innerHTML = "";
  monitorEmpty.classList.toggle("hidden", cards.length > 0);
  monitorGrid.classList.toggle("hidden", cards.length === 0);

  cards.forEach((card) => {
    const article = document.createElement("button");
    article.type = "button";
    article.className = "monitor-card";
    const protocolLabel = card.mode === "tcpping" ? "TCP Ping" : card.mode === "portscan" ? "Port Scan" : "ICMP Ping";
    const targetLabel = card.mode === "tcpping" && card.port ? `${card.target}:${card.port}` : card.target;
    const sparkValues = Array.isArray(card.spark) ? card.spark.filter((value) => Number.isFinite(value)) : [];
    const sparkMax = sparkValues.length > 0 ? Math.max(...sparkValues, 1) : 1;
    const sparkMarkup = sparkValues.length > 0
      ? sparkValues.map((value) => {
          const height = Math.max(16, Math.round((value / sparkMax) * 100));
          return `<span class="monitor-sparkline-bar" style="height:${height}%"></span>`;
        }).join("")
      : `<span class="monitor-sparkline-empty">No signal</span>`;
    article.innerHTML = `
      <div class="monitor-card-head">
        <div>
          <h3 class="monitor-card-title">${targetLabel || "-"}</h3>
          <p class="monitor-card-copy">${protocolLabel}</p>
        </div>
        <span class="${monitorStateClass(card.state)}">${card.state}</span>
      </div>
      <div class="monitor-sparkline ${sparkValues.length === 0 ? "monitor-sparkline-idle" : ""}">${sparkMarkup}</div>
      <div class="monitor-metrics">
        <div class="monitor-metric">
          <span class="monitor-metric-label">Last RTT</span>
          <span class="monitor-metric-value">${card.lastRTT || "-"}</span>
        </div>
        <div class="monitor-metric">
          <span class="monitor-metric-label">Average</span>
          <span class="monitor-metric-value">${card.avgText || "-"}</span>
        </div>
      </div>
      <div class="monitor-meta">${card.summaryText}</div>
      <div class="monitor-meta">Updated ${formatRelativeTime(card.updatedAt)} - ${card.statusText}</div>
    `;
    article.addEventListener("click", () => {
      navigateToDashboardPanel(card.state === "error" || card.state === "warning" ? "history" : card.mode, {
        target: card.target,
        mode: card.mode,
        port: card.port || 0,
        smooth: false,
      });
    });
    monitorGrid.appendChild(article);
  });
}

function formatRelativeTime(ts) {
  const delta = Math.max(0, Date.now() - ts);
  if (delta < 1000) {
    return "just now";
  }
  const seconds = Math.round(delta / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function markMonitorRunStart(mode, payload) {
  const port = mode === "tcpping" ? payload.port || 0 : 0;
  const card = ensureMonitorCard(mode, payload.host, port);
  card.state = "running";
  card.statusText = "Streaming live probes";
  card.summaryText = mode === "portscan" ? `Scanning ${payload.ports || "selected ports"}.` : "Probe run started.";
  card.updatedAt = Date.now();
  activeMonitorKey = card.key;
  setTerminalRunContext(mode, payload);
  pushSOCEvent(
    `${modeLabel(mode)} armed`,
    mode === "portscan"
      ? `${payload.host} scanning ${payload.ports || "selected ports"}.`
      : `${payload.host} entered live probe mode.`,
    "info",
  );
  renderMonitorGrid();
  updateOverviewCards();
}

function markMonitorResult(result, mode, protocol) {
  const key = activeMonitorKey;
  if (!key || !liveMonitorMap.has(key)) {
    return;
  }
  const card = liveMonitorMap.get(key);
  card.updatedAt = Date.now();
  if (mode === "portscan" || protocol === "tcp-portscan" || result.port) {
    card.statusText = result.state || (result.error ? "closed" : "open");
    card.summaryText = result.error ? result.error : `${result.port} ${result.state || "scanned"}`;
    card.lastRTT = formatRtt(result);
    card.state = result.error ? "warning" : "healthy";
    appendMonitorSample(card, numericRttValue(card.lastRTT) || 8);
    lastProbeSnapshot = {
      rttText: card.lastRTT,
      copy: `${card.target} port ${result.port} ${card.statusText}.`,
    };
    updateTerminalEvent(
      `Port ${result.port} ${card.statusText}`,
      result.error ? result.error : `${card.target} reported ${card.statusText} during the port sweep.`,
      result.error ? "warning" : "healthy",
      card.lastRTT,
      "live",
      result.error ? "warning" : "open",
    );
    pushSOCEvent(
      `Port ${result.port} ${card.statusText}`,
      result.error ? `${card.target}: ${result.error}` : `${card.target} exposed ${result.port} as ${card.statusText}.`,
      result.error ? "warning" : "success",
    );
  } else {
    card.lastRTT = formatRtt(result);
    card.statusText = result.error ? "probe error" : "reply received";
    card.summaryText = result.error ? result.error : `Seq ${result.seq} responded from ${result.addr || "-"}.`;
    card.state = result.error ? "warning" : "running";
    appendMonitorSample(card, numericRttValue(card.lastRTT) || 10);
    lastProbeSnapshot = {
      rttText: card.lastRTT,
      copy: `${card.target} ${card.statusText}.`,
    };
    updateTerminalEvent(
      result.error ? `Seq ${result.seq} error` : `Seq ${result.seq} response`,
      result.error ? result.error : `${card.target} replied from ${result.addr || "-"}.`,
      result.error ? "warning" : "running",
      card.lastRTT,
      "live",
      result.error ? "warning" : "replies",
    );
    pushSOCEvent(
      result.error ? `Probe error · ${card.target}` : `Reply received · ${card.target}`,
      result.error ? result.error : `${card.lastRTT} from ${result.addr || "-"}.`,
      result.error ? "warning" : "success",
    );
  }
  renderMonitorGrid();
  updateOverviewCards();
}

function markMonitorSummary(summary, target, mode, protocol) {
  const key = activeMonitorKey || monitorKeyFor(mode, target, mode === "tcpping" ? parseInt(portField.value, 10) || 0 : 0);
  const card = liveMonitorMap.get(key) || ensureMonitorCard(mode, target, mode === "tcpping" ? parseInt(portField.value, 10) || 0 : 0);
  card.updatedAt = Date.now();

  if (mode === "portscan" || protocol === "tcp-portscan" || typeof summary.scanned === "number") {
    card.state = summary.open > 0 ? "healthy" : "idle";
    card.summaryText = `${summary.scanned || 0} scanned, ${summary.open || 0} open, ${summary.closed || 0} closed.`;
    card.statusText = "scan complete";
    card.avgText = summary.duration || "-";
    if (!card.lastRTT) {
      card.lastRTT = "-";
    }
    appendMonitorSample(card, numericRttValue(card.lastRTT) || 6);
    terminalTelemetryState.feedState = "complete";
    terminalTelemetryState.signal = summary.open > 0 ? "open ports" : "closed sweep";
    updateTerminalEvent(
      "Port scan complete",
      `${target} finished with ${summary.open || 0} open and ${summary.closed || 0} closed ports.`,
      summary.open > 0 ? "healthy" : "idle",
      card.lastRTT,
      "complete",
      terminalTelemetryState.signal,
    );
    pushSOCEvent(
      "Port scan complete",
      `${target}: ${summary.scanned || 0} scanned · ${summary.open || 0} open · ${summary.closed || 0} closed.`,
      summary.open > 0 ? "warning" : "success",
    );
  } else {
    const loss = typeof summary.loss === "number" ? summary.loss : 0;
    card.state = loss >= 50 ? "error" : loss > 0 ? "warning" : "healthy";
    card.avgText = summary.avg || "-";
    card.summaryText = `${summary.recv || 0}/${summary.sent || 0} replies, ${loss.toFixed ? loss.toFixed(1) : loss}% loss.`;
    card.statusText = "run complete";
    appendMonitorSample(card, numericRttValue(summary.avg) || numericRttValue(card.lastRTT) || 12);
    if (summary.avg) {
      lastProbeSnapshot = {
        rttText: summary.avg,
        copy: `${target} completed with ${loss.toFixed ? loss.toFixed(1) : loss}% loss.`,
      };
    }
    terminalTelemetryState.feedState = "complete";
    terminalTelemetryState.signal = loss >= 50 ? "degraded" : loss > 0 ? "loss" : "stable";
    updateTerminalEvent(
      "Probe run complete",
      `${target} finished with ${summary.recv || 0}/${summary.sent || 0} replies and ${loss.toFixed ? loss.toFixed(1) : loss}% loss.`,
      loss >= 50 ? "error" : loss > 0 ? "warning" : "healthy",
      summary.avg || card.lastRTT,
      "complete",
      terminalTelemetryState.signal,
    );
    pushSOCEvent(
      "Probe run complete",
      `${target}: avg ${summary.avg || "-"} · loss ${loss.toFixed ? loss.toFixed(1) : loss}%.`,
      loss >= 50 ? "error" : loss > 0 ? "warning" : "success",
    );
  }

  activeMonitorKey = "";
  renderMonitorGrid();
  updateOverviewCards();
}

function markMonitorFailure(message) {
  if (!activeMonitorKey || !liveMonitorMap.has(activeMonitorKey)) {
    return;
  }
  const card = liveMonitorMap.get(activeMonitorKey);
  card.state = "error";
  card.statusText = "run failed";
  card.summaryText = message || "Run failed.";
  card.updatedAt = Date.now();
  appendMonitorSample(card, numericRttValue(card.lastRTT) || 14);
  updateTerminalEvent("Run failed", message || "Run failed.", "error", card.lastRTT, "fault", "failure");
  pushSOCEvent("Run failed", message || "Run failed.", "error");
  activeMonitorKey = "";
  renderMonitorGrid();
  updateOverviewCards();
}

function markMonitorStopped() {
  if (!activeMonitorKey || !liveMonitorMap.has(activeMonitorKey)) {
    return;
  }
  const card = liveMonitorMap.get(activeMonitorKey);
  card.state = "idle";
  card.statusText = "stopped";
  card.summaryText = "Run stopped by operator.";
  card.updatedAt = Date.now();
  appendMonitorSample(card, numericRttValue(card.lastRTT) || 8);
  updateTerminalEvent("Run stopped", "Operator terminated the active telemetry session.", "idle", card.lastRTT, "paused", "stopped");
  pushSOCEvent("Run stopped", `${card.target} was stopped by the operator.`, "warning");
  activeMonitorKey = "";
  renderMonitorGrid();
  updateOverviewCards();
}

function buildHistorySelection() {
  const host = hostField.value.trim();
  if (!host) {
    return null;
  }
  if (currentMode === "portscan") {
    return {
      mode: "portscan",
      host,
    };
  }
  if (currentMode === "tcpping") {
    const port = parseInt(portField.value, 10);
    return {
      mode: "tcpping",
      host,
      port: Number.isNaN(port) ? 0 : port,
    };
  }
  return {
    mode: "ping",
    host,
    port: 0,
  };
}

function exportHistoryFileName(format, selection) {
  const safeHost = (selection?.host || "history").replace(/[:/\\\\\\s]+/g, "_");
  if (selection?.mode === "tcpping" && selection?.port) {
    return `${selection.mode}_${safeHost}_${selection.port}.${format}`;
  }
  return `${selection?.mode || "history"}_${safeHost}.${format}`;
}

function extractDownloadFileName(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
  if (!match || !match[1]) {
    return fallback;
  }
  return decodeURIComponent(match[1].replace(/^UTF-8''/i, "").replace(/\"/g, ""));
}

async function downloadHistoryExport(format) {
  const selection = buildHistorySelection();
  if (!selection || selection.mode === "portscan") {
    return;
  }

  const trigger = format === "csv" ? historyExportCSV : historyExportJSON;
  const other = format === "csv" ? historyExportJSON : historyExportCSV;
  trigger.disabled = true;
  other.disabled = true;

  try {
    const payload = {
      type: selection.mode,
      host: selection.host,
      limit: 240,
      format,
    };
    if (selection.mode === "tcpping" && selection.port) {
      payload.port = selection.port;
    }

    const res = await fetch("/api/export/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) {
      let message = "Unable to export history";
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        message = data.error || message;
      } else {
        const text = await res.text();
        if (text) {
          message = text;
        }
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    const downloadURL = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadURL;
    anchor.download = extractDownloadFileName(res, exportHistoryFileName(format, selection));
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadURL);
  } catch (err) {
    historyContext.textContent = err.message || "Unable to export history.";
  } finally {
    trigger.disabled = false;
    other.disabled = false;
  }
}

function renderHistoryPanel(points, selection) {
  historyResults.innerHTML = "";

  if (!selection) {
    historyContext.textContent = "No target selected yet.";
    historyEmpty.textContent = "Run a diagnostic or set a target first. History is available for ICMP Ping and TCP Ping.";
    historyEmpty.classList.remove("hidden");
    historyTableWrap.classList.add("hidden");
    historyExportJSON.classList.add("hidden");
    historyExportCSV.classList.add("hidden");
    return;
  }

  if (selection.mode === "portscan") {
    historyContext.textContent = `Port scan selected for ${selection.host}. Persistent history is not enabled for port scans yet.`;
    historyEmpty.textContent = "Switch to ICMP Ping or TCP Ping to browse stored history and exports.";
    historyEmpty.classList.remove("hidden");
    historyTableWrap.classList.add("hidden");
    historyExportJSON.classList.add("hidden");
    historyExportCSV.classList.add("hidden");
    return;
  }

  historyContext.textContent = selection.mode === "tcpping"
    ? `Showing recent TCP Ping history for ${selection.host}:${selection.port}.`
    : `Showing recent ICMP Ping history for ${selection.host}.`;
  historyExportJSON.classList.remove("hidden");
  historyExportCSV.classList.remove("hidden");

  if (!Array.isArray(points) || points.length === 0) {
    historyEmpty.textContent = "No stored points yet for this target.";
    historyEmpty.classList.remove("hidden");
    historyTableWrap.classList.add("hidden");
    return;
  }

  points.forEach((point) => {
    const tr = document.createElement("tr");
    const timestamp = formatTimestamp(point.ts);
    const status = point.error ? `Error: ${point.error}` : "OK";
    const rtt = typeof point.rtt_ms === "number" ? `${point.rtt_ms.toFixed(3)}ms` : "-";
    tr.innerHTML = `
      <td>${timestamp}</td>
      <td>${point.seq || "-"}</td>
      <td>${rtt}</td>
      <td>${status}</td>
    `;
    historyResults.appendChild(tr);
  });

  historyEmpty.classList.add("hidden");
  historyTableWrap.classList.remove("hidden");
}

async function loadDashboardHistory() {
  if (!isAuthenticated) {
    return;
  }

  const selection = buildHistorySelection();
  renderHistoryPanel([], selection);
  if (!selection || selection.mode === "portscan") {
    return;
  }

  try {
    const params = new URLSearchParams({
      type: selection.mode,
      host: selection.host,
      limit: "120",
    });
    if (selection.mode === "tcpping" && selection.port) {
      params.set("port", selection.port);
    }
    const res = await fetch(`/api/history?${params.toString()}`);
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to load history");
    }
    renderHistoryPanel(Array.isArray(data) ? data : [], selection);
  } catch (err) {
    historyContext.textContent = "History could not be loaded.";
    historyEmpty.textContent = err.message || "Unable to load history.";
    historyEmpty.classList.remove("hidden");
    historyTableWrap.classList.add("hidden");
  }
}

function setHealthCardState(titleEl, copyEl, enabled, healthy, detail, driver = "") {
  const card = titleEl.closest(".status-card");
  card.classList.remove("is-healthy", "is-unhealthy", "is-disabled");
  if (!enabled) {
    titleEl.textContent = "Disabled";
    copyEl.textContent = detail || "Dependency not enabled.";
    card.classList.add("is-disabled");
    return;
  }
  if (healthy) {
    titleEl.textContent = "Healthy";
    copyEl.textContent = driver ? `${driver} online` : detail || "Dependency online.";
    card.classList.add("is-healthy");
    return;
  }
  titleEl.textContent = "Degraded";
  copyEl.textContent = detail || "Dependency reported an error.";
  card.classList.add("is-unhealthy");
}

async function refreshSettingsPanel(showNotice = false) {
  if (!isAuthenticated) {
    return;
  }

  settingsOrigin.textContent = location.origin;
  settingsRealtime.textContent = "WebSocket + HTTP";
  settingsSession.textContent = isAuthenticated ? "Active" : "Locked";

  try {
    const res = await fetch("/healthz");
    const data = await res.json();
    if (!res.ok && !data) {
      throw new Error("Unable to load runtime health");
    }
    runtimeHealth = {
      ok: Boolean(data.ok),
      summary: data.ok ? "Database, cache, and object storage are online." : "One or more dependencies need attention.",
      database: data.database?.enabled ? Boolean(data.database?.healthy) : null,
      redis: data.redis?.enabled ? Boolean(data.redis?.healthy) : null,
      objectStorage: data.object_storage?.enabled ? Boolean(data.object_storage?.healthy) : null,
      session: isAuthenticated,
    };
    commandHealthPill.textContent = data.ok ? "Runtime healthy" : "Runtime degraded";
    commandHealthPill.className = data.ok ? "command-pill command-pill-healthy" : "command-pill command-pill-unhealthy";
    setHealthCardState(settingsDBStatus, settingsDBCopy, data.database?.enabled, data.database?.healthy, data.database?.error, data.database?.driver);
    setHealthCardState(settingsRedisStatus, settingsRedisCopy, data.redis?.enabled, data.redis?.healthy, data.redis?.error);
    setHealthCardState(settingsObjectStatus, settingsObjectCopy, data.object_storage?.enabled, data.object_storage?.healthy, data.object_storage?.error);
    updateOverviewCards();
    if (showNotice) {
      setSettingsNotice("Runtime status refreshed.", "success");
    } else {
      setSettingsNotice("");
    }
  } catch (err) {
    runtimeHealth = {
      ok: false,
      summary: err.message || "Unable to load runtime health.",
      database: false,
      redis: false,
      objectStorage: false,
      session: isAuthenticated,
    };
    commandHealthPill.textContent = "Runtime degraded";
    commandHealthPill.className = "command-pill command-pill-unhealthy";
    updateOverviewCards();
    setSettingsNotice(err.message || "Unable to load system status.", "error");
  }
}

function renderProfilePanel() {
  if (!currentUser) {
    return;
  }
  profileName.textContent = currentUser.name || "Operator";
  profileEmail.textContent = currentUser.email || "-";
  if (currentUser.email_verified_at) {
    profileVerification.textContent = "Verified";
    profileVerificationCopy.textContent = `Verified on ${formatTimestamp(currentUser.email_verified_at)}.`;
  } else {
    profileVerification.textContent = "Pending";
    profileVerificationCopy.textContent = "Email verification is still required.";
  }
  profileCreated.textContent = currentUser.created_at ? formatTimestamp(currentUser.created_at) : "-";
  profileSession.textContent = isAuthenticated ? "Authenticated" : "Locked";
  setProfileNotice("");
}

async function sendProfileResetLink() {
  if (!currentUser?.email) {
    return;
  }
  setProfileNotice("");
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to send reset email");
    }
    setProfileNotice(data.message || "Password reset email issued.", "success");
  } catch (err) {
    setProfileNotice(err.message, "error");
  }
}

function getDashboardPanelFromLocation() {
  const dashboardPathToPanel = {
    "/": "overview",
    "/icmp-ping": "ping",
    "/tcp-ping": "tcpping",
    "/port-scan": "portscan",
    "/history": "history",
    "/alerts": "alerts",
    "/settings": "settings",
    "/profile": "profile",
    "/dns-lookup": "dns",
    "/whois-query": "whois",
    "/arp-table": "arp",
    "/netstat": "netstat",
    "/traceroute": "traceroute",
    "/ping-sweep": "pingsweep",
    "/ssl-tls-check": "sslcheck",
    "/http-header-analyzer": "httpheaders",
    "/service-fingerprinting": "fingerprint",
    "/firewall-testing": "firewall",
    "/nat-proxy-detection": "natproxy",
    "/packet-capture": "packet",
    "/bandwidth-test": "bandwidth",
    "/snmp-queries": "snmp",
    "/multi-host-monitoring": "multihost",
    "/ip-geolocation": "geolocation",
    "/mac-vendor-lookup": "macvendor",
    "/ipv6-support": "ipv6",
    "/logging-system": "logging",
    "/export-results": "export",
    "/visualization": "visualization",
    "/scheduler": "scheduler",
    "/dashboard-view": "dashboard-view",
    "/api-mode": "api",
    "/plugin-system": "plugins",
    "/gui-cli-hybrid": "gui",
    "/mobile-output": "mobile",
  };
  return dashboardPathToPanel[location.pathname] || new URLSearchParams(location.search).get("panel") || "";
}

function normalizeDashboardPanel(panel) {
  switch (panel) {
    case "overview":
    case "alerts":
    case "history":
    case "settings":
    case "profile":
    case "tcpping":
    case "portscan":
    case "dns":
    case "whois":
    case "arp":
    case "netstat":
    case "traceroute":
    case "pingsweep":
    case "sslcheck":
    case "httpheaders":
    case "fingerprint":
    case "firewall":
    case "natproxy":
    case "packet":
    case "bandwidth":
    case "snmp":
    case "multihost":
    case "geolocation":
    case "macvendor":
    case "ipv6":
    case "logging":
    case "export":
    case "visualization":
    case "scheduler":
    case "dashboard-view":
    case "api":
    case "plugins":
    case "gui":
    case "mobile":
      return panel;
    default:
      return panel === "ping" ? "ping" : "overview";
  }
}

function dashboardURLForPanel(panel) {
  const normalized = normalizeDashboardPanel(panel);
  const dashboardPanelToPath = {
    overview: "/",
    ping: "/icmp-ping",
    tcpping: "/tcp-ping",
    portscan: "/port-scan",
    history: "/history",
    alerts: "/alerts",
    settings: "/settings",
    profile: "/profile",
    dns: "/dns-lookup",
    whois: "/whois-query",
    arp: "/arp-table",
    netstat: "/netstat",
    traceroute: "/traceroute",
    pingsweep: "/ping-sweep",
    sslcheck: "/ssl-tls-check",
    httpheaders: "/http-header-analyzer",
    fingerprint: "/service-fingerprinting",
    firewall: "/firewall-testing",
    natproxy: "/nat-proxy-detection",
    packet: "/packet-capture",
    bandwidth: "/bandwidth-test",
    snmp: "/snmp-queries",
    multihost: "/multi-host-monitoring",
    geolocation: "/ip-geolocation",
    macvendor: "/mac-vendor-lookup",
    ipv6: "/ipv6-support",
    logging: "/logging-system",
    export: "/export-results",
    visualization: "/visualization",
    scheduler: "/scheduler",
    "dashboard-view": "/dashboard-view",
    api: "/api-mode",
    plugins: "/plugin-system",
    gui: "/gui-cli-hybrid",
    mobile: "/mobile-output",
  };
  return dashboardPanelToPath[normalized] || "/";
}

function toggleSidebar(open) {
  const shouldOpen = Boolean(open) && isAuthenticated && window.innerWidth <= 980;
  appPanel.classList.toggle("sidebar-open", shouldOpen);
  dashboardSidebar.classList.toggle("is-open", shouldOpen);
  sidebarBackdrop.classList.toggle("hidden", !shouldOpen);
  sidebarToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

function highlightAlertsPanel(smooth = true) {
  alertsPanel.classList.remove("deep-linked");
  void alertsPanel.offsetWidth;
  alertsPanel.classList.add("deep-linked");
  alertsPanel.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  window.setTimeout(() => {
    alertsPanel.classList.remove("deep-linked");
  }, 1800);
}

function applyDashboardPanel(panel, options = {}) {
  const { pushHistory = false, replaceHistory = false, updateHistory = true, smooth = true } = options;
  const normalized = normalizeDashboardPanel(panel);
  const showingOverview = normalized === "overview";
  const showingDiagnostics = normalized === "ping" || normalized === "tcpping" || normalized === "portscan";
  const featurePanels = [
    dnsPanel, whoisPanel, arpPanel, netstatPanel, traceroutePanel, pingsweepPanel,
    sslcheckPanel, httpheadersPanel, fingerprintPanel, firewallPanel, natproxyPanel,
    packetPanel, bandwidthPanel, snmpPanel, multihostPanel, geolocationPanel,
    macvendorPanel, ipv6Panel, loggingPanel, exportPanel, visualizationPanel,
    schedulerPanel, dashboardViewPanel, apiPanel, pluginsPanel, guiPanel, mobilePanel
  ];
  const isFeaturePanel = [
    "dns", "whois", "arp", "netstat", "traceroute", "pingsweep",
    "sslcheck", "httpheaders", "fingerprint", "firewall", "natproxy",
    "packet", "bandwidth", "snmp", "multihost", "geolocation",
    "macvendor", "ipv6", "logging", "export", "visualization",
    "scheduler", "dashboard-view", "api", "plugins", "gui", "mobile"
  ].includes(normalized);

  currentPanel = normalized;
  pendingDashboardPanel = normalized;

  if (showingDiagnostics) {
    currentMode = normalized;
  }

  // Show/hide overview based on panel type
  dashboardOverview.classList.toggle("hidden", !showingOverview);

  // Show/hide diagnostics panel
  diagnosticsPanel.classList.toggle("hidden", !showingDiagnostics);
  
  // Show/hide other main panels
  historyPanel.classList.toggle("hidden", normalized !== "history");
  alertsPanel.classList.toggle("hidden", normalized !== "alerts");
  settingsPanel.classList.toggle("hidden", normalized !== "settings");
  profilePanel.classList.toggle("hidden", normalized !== "profile");
  
  // Show/hide feature panels
  featurePanels.forEach((featurePanel) => {
    if (!featurePanel) return;
    const panelId = featurePanel.id;
    const expectedId = normalized + "-panel";
    featurePanel.classList.toggle("hidden", panelId !== expectedId);
  });

  dashboardNavButtons.forEach((button) => {
    const buttonPanel = normalizeDashboardPanel(button.dataset.panel || button.dataset.mode || "ping");
    button.classList.toggle("active", buttonPanel === normalized);
  });
  refreshSidebarGroupState();
  updateCommandBar();

  if (updateHistory && isAuthenticated) {
    const nextURL = dashboardURLForPanel(normalized);
    if (`${location.pathname}${location.search}` !== nextURL) {
      if (pushHistory) {
        history.pushState({}, "", nextURL);
      } else if (replaceHistory) {
        history.replaceState({}, "", nextURL);
      } else {
        history.replaceState({}, "", nextURL);
      }
    }
  }

  updateModeUI();

  if (normalized === "alerts") {
    highlightAlertsPanel(smooth);
  }
  if (normalized === "history") {
    void loadDashboardHistory();
  }
  if (normalized === "settings") {
    void refreshSettingsPanel();
  }
  if (normalized === "profile") {
    renderProfilePanel();
  }

  if (window.innerWidth <= 980) {
    toggleSidebar(false);
  }
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function updateModeUI() {
  const isPing = currentMode === "ping";
  const isTCP = currentMode === "tcpping";
  const isScan = currentMode === "portscan";
  const showingDashboardPage = currentPanel !== "ping" && currentPanel !== "tcpping" && currentPanel !== "portscan";

  probeRow.classList.toggle("hidden", isScan);
  tcpPortField.classList.toggle("hidden", !isTCP);
  countField.classList.toggle("hidden", isScan);
  scanFields.classList.toggle("hidden", !isScan);
  intervalField.classList.toggle("hidden", isScan);
  sizeField.classList.toggle("hidden", !isPing);
  ipv6Option.classList.toggle("hidden", !isPing);
  chartCard.classList.toggle("hidden", isScan);
  runBtn.disabled = showingDashboardPage || !isAuthenticated || Boolean(activeSocket || activeController);
  stopBtn.disabled = showingDashboardPage || !(activeSocket || activeController);

  if (isPing) {
    hintEl.textContent = "ICMP ping may require admin/root permission.";
  } else if (isTCP) {
    hintEl.textContent = "TCP ping uses a standard TCP connect.";
  } else {
    hintEl.textContent = "TCP port scan checks the ports you specify and streams each result live.";
  }

  updateTableHeaders(currentMode);
  syncModeButtons();
}

function updateTableHeaders(mode) {
  if (mode === "portscan") {
    resultsCol1.textContent = "Port";
    resultsCol2.textContent = "State";
    resultsCol3.textContent = "RTT";
    resultsCol4.textContent = "Detail";
    return;
  }

  resultsCol1.textContent = "Seq";
  resultsCol2.textContent = "Status";
  resultsCol3.textContent = "RTT";
  resultsCol4.textContent = "Addr";
}

async function runViaHTTP(mode, payload) {
  const controller = new AbortController();
  activeController = controller;
  setStatus("Running", true);
  setStopState(true);
  syncModeButtons();

  try {
    const res = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json();
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    renderReport(mode, data);
    setStatus("Done", false);
  } catch (err) {
    if (err.name === "AbortError") {
      markMonitorStopped();
      setStatus("Stopped", false);
      return;
    }
    markMonitorFailure(err.message);
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    setStatus("Error", false);
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
    activeRunMode = null;
    setStopState(false);
    syncModeButtons();
  }
}

function buildPayload(mode) {
  const host = document.getElementById("host").value.trim();
  if (!host) {
    errorEl.textContent = "Host is required.";
    errorEl.classList.remove("hidden");
    return null;
  }

  const count = parseInt(document.getElementById("count").value, 10);
  const interval = parseInt(document.getElementById("interval").value, 10);
  const timeout = parseInt(document.getElementById("timeout").value, 10);
  const size = parseInt(document.getElementById("size").value, 10);

  if (mode === "ping") {
    return {
      host,
      count: Number.isNaN(count) ? 0 : count,
      interval_ms: Number.isNaN(interval) ? 0 : interval,
      timeout_ms: Number.isNaN(timeout) ? 0 : timeout,
      size: Number.isNaN(size) ? 0 : size,
      ipv6: document.getElementById("ipv6").checked,
    };
  }

  if (mode === "tcpping") {
    const port = parseInt(portField.value, 10);
    return {
      host,
      port: Number.isNaN(port) ? 0 : port,
      count: Number.isNaN(count) ? 0 : count,
      interval_ms: Number.isNaN(interval) ? 0 : interval,
      timeout_ms: Number.isNaN(timeout) ? 0 : timeout,
    };
  }

  const concurrency = parseInt(concurrencyField.value, 10);
  return {
    host,
    ports: portsField.value.trim(),
    timeout_ms: Number.isNaN(timeout) ? 0 : timeout,
    concurrency: Number.isNaN(concurrency) ? 0 : concurrency,
  };
}

function shouldUseHTTPTransport(mode, payload) {
  if (!("WebSocket" in window) || !payload) {
    return true;
  }
  const encoded = JSON.stringify({ type: mode, ...payload });
  return encoded.length >= 3072;
}

function renderReport(mode, report) {
  resultsEl.innerHTML = "";
  report.results.forEach((result) => appendResult(result, report.addr, Date.now(), mode, report.protocol));
  renderSummary(report.summary, report.target, report.addr, mode, report.protocol);
}

function renderSummary(summary, target, addr, mode, protocol) {
  if (!summary) {
    summaryEl.innerHTML = "";
    setTerminalStateBadge(terminalSummaryState, "idle", "idle");
    return;
  }

  const effectiveMode = mode || activeRunMode || currentMode;
  const isScan = effectiveMode === "portscan" || protocol === "tcp-portscan" || typeof summary.scanned === "number" && summary.scanned > 0;
  markMonitorSummary(summary, target || "-", effectiveMode, protocol);

  if (isScan) {
    summaryEl.innerHTML = `
      <div class="terminal-summary-line"><span>Target</span><strong>${target || "-"}</strong></div>
      <div class="terminal-summary-line"><span>Address</span><strong>${addr || "-"}</strong></div>
      <div class="terminal-summary-line"><span>Scan</span><strong>${summary.scanned || 0} scanned · ${summary.open || 0} open · ${summary.closed || 0} closed</strong></div>
      <div class="terminal-summary-line"><span>Timeout</span><strong>${summary.timeout || 0}</strong></div>
      ${summary.duration ? `<div class="terminal-summary-line"><span>Duration</span><strong>${summary.duration}</strong></div>` : ""}
    `;
    setTerminalStateBadge(terminalSummaryState, summary.open > 0 ? "open ports" : "complete", summary.open > 0 ? "warning" : "healthy");
    return;
  }

  const loss = typeof summary.loss === "number" ? summary.loss.toFixed(1) : summary.loss;
  summaryEl.innerHTML = `
    <div class="terminal-summary-line"><span>Target</span><strong>${target || "-"}</strong></div>
    <div class="terminal-summary-line"><span>Address</span><strong>${addr || "-"}</strong></div>
    <div class="terminal-summary-line"><span>Replies</span><strong>${summary.recv}/${summary.sent} · ${loss}% loss</strong></div>
    ${summary.min ? `<div class="terminal-summary-line"><span>RTT</span><strong>${summary.min} / ${summary.avg} / ${summary.max}</strong></div>` : ""}
    ${summary.stddev ? `<div class="terminal-summary-line"><span>Stddev</span><strong>${summary.stddev}</strong></div>` : ""}
  `;
  setTerminalStateBadge(
    terminalSummaryState,
    Number.parseFloat(loss) >= 50 ? "degraded" : Number.parseFloat(loss) > 0 ? "loss" : "healthy",
    Number.parseFloat(loss) >= 50 ? "error" : Number.parseFloat(loss) > 0 ? "warning" : "healthy",
  );
}

function appendResult(result, fallbackAddr, ts, mode, protocol) {
  const effectiveMode = mode || activeRunMode || currentMode;
  markMonitorResult(result, effectiveMode, protocol);
  if (effectiveMode === "portscan" || protocol === "tcp-portscan" || result.port) {
    appendPortScanResult(result);
    return;
  }
  appendProbeResult(result, fallbackAddr, ts);
}

function appendProbeResult(result, fallbackAddr, ts) {
  const shouldStick = shouldAutoScroll(tableWrap);
  const tr = document.createElement("tr");
  const status = result.error ? `Error: ${result.error}` : "OK";
  const rtt = formatRtt(result);
  const addr = result.addr || fallbackAddr || "-";

  tr.innerHTML = `
    <td>${result.seq}</td>
    <td>${status}</td>
    <td>${rtt}</td>
    <td>${addr}</td>
  `;
  resultsEl.appendChild(tr);

  if (typeof result.rtt_ms === "number") {
    addChartPoint(ts || Date.now(), result.rtt_ms);
  }

  if (shouldStick) {
    scrollToBottom(tableWrap);
  }
}

function appendPortScanResult(result) {
  const shouldStick = shouldAutoScroll(tableWrap);
  const tr = document.createElement("tr");
  const detail = result.addr || result.error || "-";
  tr.innerHTML = `
    <td>${result.port}</td>
    <td>${result.state || "closed"}</td>
    <td>${formatRtt(result)}</td>
    <td>${detail}</td>
  `;
  resultsEl.appendChild(tr);

  if (shouldStick) {
    scrollToBottom(tableWrap);
  }
}

function clearOutput() {
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
  summaryEl.innerHTML = "";
  resultsEl.innerHTML = "";
  resetChart();
  resetTerminalTelemetry(currentMode);
  setStopState(false);
  if (tableWrap) {
    tableWrap.scrollTop = 0;
  }
}

function setStatus(text, busy) {
  statusBadge.textContent = text;
  const dashboardPageOpen = currentPanel !== "ping" && currentPanel !== "tcpping" && currentPanel !== "portscan";
  runBtn.disabled = busy || !isAuthenticated || dashboardPageOpen;
  if (busy) {
    if (text === "Connecting") {
      runBtn.textContent = "Connecting...";
    } else if (text === "Stopping") {
      runBtn.textContent = "Stopping...";
    } else {
      runBtn.textContent = "Running...";
    }
  } else {
    runBtn.textContent = "Run Diagnostics";
  }
  syncModeButtons();
}

function setStopState(enabled, label = "Stop") {
  const dashboardPageOpen = currentPanel !== "ping" && currentPanel !== "tcpping" && currentPanel !== "portscan";
  stopBtn.disabled = !enabled || dashboardPageOpen;
  stopBtn.textContent = label;
}

async function loadHistory(mode, payload) {
  chartLabel.textContent = "Realtime";
  if (!payload || !payload.host) {
    return;
  }
  if (mode === "portscan") {
    resetChart();
    chartLabel.textContent = "Not used for port scans";
    return;
  }

  const params = new URLSearchParams({
    type: mode,
    host: payload.host,
    limit: "120",
  });
  if (mode === "tcpping" && payload.port) {
    params.set("port", payload.port);
  }

  try {
    const res = await fetch(`/api/history?${params.toString()}`);
    if (res.status === 401) {
      handleAuthExpired();
      return;
    }
    if (!res.ok) {
      console.warn("Failed to load history:", res.status, res.statusText);
      return;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      chartData = data.map((point) => ({ ts: point.ts, rtt: point.rtt_ms }));
      chartLabel.textContent = "History + Live";
      renderChart();
    }
  } catch (err) {
    console.warn("Error loading history:", err);
  }
}

function resetChart() {
  chartData = [];
  renderChart();
}

function addChartPoint(ts, rtt) {
  chartData.push({ ts, rtt });
  if (chartData.length > 240) {
    chartData.shift();
  }
  renderChart();
}

function renderChart() {
  if (chartCard.classList.contains("hidden")) {
    renderOverviewLatencyStrip();
    return;
  }

  const rect = chartCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (width === 0 || height === 0) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  chartCanvas.width = width * dpr;
  chartCanvas.height = height * dpr;
  chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  chartCtx.clearRect(0, 0, width, height);
  chartCtx.fillStyle = "rgba(255, 255, 255, 0.04)";
  chartCtx.fillRect(0, 0, width, height);

  const points = chartData.filter((point) => typeof point.rtt === "number");
  if (points.length === 0) {
    chartCtx.fillStyle = "rgba(148, 163, 184, 0.7)";
    chartCtx.font = "12px 'Space Grotesk', sans-serif";
    chartCtx.fillText("No data yet", 12, 24);
    renderOverviewLatencyStrip();
    return;
  }

  const padding = 16;
  const min = Math.min(...points.map((point) => point.rtt));
  const max = Math.max(...points.map((point) => point.rtt));
  const range = max - min || 1;
  const tMin = chartData[0].ts;
  const tMax = chartData[chartData.length - 1].ts || tMin + 1;

  chartCtx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  chartCtx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    chartCtx.beginPath();
    chartCtx.moveTo(padding, y);
    chartCtx.lineTo(width - padding, y);
    chartCtx.stroke();
  }

  chartCtx.strokeStyle = "#4fd1c5";
  chartCtx.lineWidth = 2;
  chartCtx.beginPath();

  let started = false;
  chartData.forEach((point) => {
    if (typeof point.rtt !== "number") {
      started = false;
      return;
    }
    const xRatio = tMax === tMin ? 1 : (point.ts - tMin) / (tMax - tMin);
    const x = padding + xRatio * (width - padding * 2);
    const y = padding + (1 - (point.rtt - min) / range) * (height - padding * 2);
    if (!started) {
      chartCtx.moveTo(x, y);
      started = true;
    } else {
      chartCtx.lineTo(x, y);
    }
  });
  chartCtx.stroke();
  renderOverviewLatencyStrip();
}

function formatRtt(result) {
  if (typeof result.rtt_ms === "number") {
    return `${result.rtt_ms.toFixed(3)}ms`;
  }
  return result.rtt || "-";
}

function shouldAutoScroll(container) {
  if (!container) {
    return false;
  }
  const threshold = 24;
  return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
}

function scrollToBottom(container) {
  if (!container) {
    return;
  }
  container.scrollTop = container.scrollHeight;
}
