const modeButtons = document.querySelectorAll(".mode");
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
const tableWrap = document.querySelector(".table-wrap");
const chartCard = document.getElementById("chart-card");
const chartCanvas = document.getElementById("chart");
const chartLabel = document.getElementById("chart-label");
const chartCtx = chartCanvas.getContext("2d");
const resultsCol1 = document.getElementById("results-col-1");
const resultsCol2 = document.getElementById("results-col-2");
const resultsCol3 = document.getElementById("results-col-3");
const resultsCol4 = document.getElementById("results-col-4");
const tcpPortField = document.getElementById("tcp-port-field");
const countField = document.getElementById("count-field");
const scanFields = document.getElementById("scan-fields");
const intervalField = document.getElementById("interval-field");
const timeoutField = document.getElementById("timeout-field");
const sizeField = document.getElementById("size-field");
const ipv6Option = document.getElementById("ipv6-option");
const probeRow = tcpPortField.parentElement;

let chartData = [];
let currentMode = "ping";
let activeSocket = null;
let activeController = null;
let activeRunMode = null;

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (activeSocket || activeController) {
      return;
    }
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    updateModeUI();
  });
});

function updateModeUI() {
  const isPing = currentMode === "ping";
  const isTCP = currentMode === "tcpping";
  const isScan = currentMode === "portscan";

  probeRow.classList.toggle("hidden", isScan);
  tcpPortField.classList.toggle("hidden", !isTCP);
  countField.classList.toggle("hidden", isScan);
  scanFields.classList.toggle("hidden", !isScan);
  intervalField.classList.toggle("hidden", isScan);
  sizeField.classList.toggle("hidden", !isPing);
  ipv6Option.classList.toggle("hidden", !isPing);
  chartCard.classList.toggle("hidden", isScan);

  if (isPing) {
    hintEl.textContent = "ICMP ping may require admin/root permission.";
  } else if (isTCP) {
    hintEl.textContent = "TCP ping uses a standard TCP connect.";
  } else {
    hintEl.textContent = "TCP port scan checks the ports you specify and streams each result live.";
  }

  updateTableHeaders(currentMode);
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

updateModeUI();

window.addEventListener("resize", () => {
  renderChart();
});

runBtn.addEventListener("click", async () => {
  if (activeSocket || activeController) {
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
  updateTableHeaders(mode);

  await loadHistory(mode, payload);

  if (!("WebSocket" in window)) {
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

async function runViaHTTP(mode, payload) {
  const controller = new AbortController();
  activeController = controller;
  setStatus("Running", true);
  setStopState(true);

  try {
    const res = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    renderReport(mode, data);
    setStatus("Done", false);
  } catch (err) {
    if (err.name === "AbortError") {
      setStatus("Stopped", false);
      return;
    }
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    setStatus("Error", false);
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
    activeRunMode = null;
    setStopState(false);
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

function renderReport(mode, report) {
  renderSummary(report.summary, report.target, report.addr, mode, report.protocol);
  resultsEl.innerHTML = "";
  report.results.forEach((result) => appendResult(result, report.addr, Date.now(), mode, report.protocol));
}

function renderSummary(summary, target, addr, mode, protocol) {
  if (!summary) {
    summaryEl.innerHTML = "";
    return;
  }

  const effectiveMode = mode || activeRunMode || currentMode;
  const isScan = effectiveMode === "portscan" || protocol === "tcp-portscan" || typeof summary.scanned === "number" && summary.scanned > 0;

  if (isScan) {
    summaryEl.innerHTML = `
      <div><strong>${target || "-"}</strong> (${addr || "-"})</div>
      <div>${summary.scanned || 0} ports scanned, ${summary.open || 0} open, ${summary.closed || 0} closed, ${summary.timeout || 0} timeout</div>
      ${summary.duration ? `<div>Completed in ${summary.duration}</div>` : ""}
    `;
    return;
  }

  const loss = typeof summary.loss === "number" ? summary.loss.toFixed(1) : summary.loss;
  summaryEl.innerHTML = `
    <div><strong>${target || "-"}</strong> (${addr || "-"})</div>
    <div>${summary.sent} probes, ${summary.recv} replies, ${loss}% loss</div>
    ${summary.min ? `<div>RTT min/avg/max/stddev = ${summary.min}/${summary.avg}/${summary.max}/${summary.stddev}</div>` : ""}
  `;
}

function appendResult(result, fallbackAddr, ts, mode, protocol) {
  const effectiveMode = mode || activeRunMode || currentMode;
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
  setStopState(false);
  if (tableWrap) {
    tableWrap.scrollTop = 0;
  }
}

function setStatus(text, busy) {
  statusBadge.textContent = text;
  runBtn.disabled = busy;
  modeButtons.forEach((button) => {
    button.disabled = busy;
  });
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
}

function setStopState(enabled, label = "Stop") {
  stopBtn.disabled = !enabled;
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
