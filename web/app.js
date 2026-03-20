const modeButtons = document.querySelectorAll(".mode");
const portField = document.getElementById("port");
const runBtn = document.getElementById("run");
const stopBtn = document.getElementById("stop");
const statusBadge = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");
const errorEl = document.getElementById("error");
const hintEl = document.getElementById("hint");
const tableWrap = document.querySelector(".table-wrap");
const chartCanvas = document.getElementById("chart");
const chartLabel = document.getElementById("chart-label");
const chartCtx = chartCanvas.getContext("2d");

let chartData = [];

let currentMode = "ping";
let activeSocket = null;

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    updateModeUI();
  });
});

function updateModeUI() {
  if (currentMode === "ping") {
    portField.disabled = true;
    portField.parentElement.classList.add("disabled");
    hintEl.textContent = "ICMP ping may require admin/root permission.";
  } else {
    portField.disabled = false;
    portField.parentElement.classList.remove("disabled");
    hintEl.textContent = "TCP ping uses a standard TCP connect.";
  }
}

updateModeUI();

window.addEventListener("resize", () => {
  renderChart();
});

runBtn.addEventListener("click", async () => {
  if (activeSocket) {
    return;
  }

  clearOutput();

  const payload = buildPayload();
  if (!payload) {
    setStatus("Idle", false);
    return;
  }

  await loadHistory(payload);

  if (!("WebSocket" in window)) {
    runViaHTTP(payload);
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
      ws.send(JSON.stringify({ type: currentMode, ...payload }));
      requestDispatched = true;
    } catch (err) {
      ws.close();
      fallbackStarted = true;
      activeSocket = null;
      runViaHTTP(payload);
    }
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "result" && msg.result) {
      appendResult(msg.result, msg.addr, msg.ts);
    }
    if (msg.type === "summary" && msg.summary) {
      finished = true;
      renderSummaryFromSummary(msg.summary, msg.target, msg.addr);
      setStatus("Done", false);
      setStopState(false);
      ws.close();
    }
    if (msg.type === "stopped") {
      finished = true;
      if (msg.summary) {
        renderSummaryFromSummary(msg.summary, msg.target, msg.addr);
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
      ws.close();
      activeSocket = null;
      runViaHTTP(payload);
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
    setStopState(false);
  });
});

stopBtn.addEventListener("click", () => {
  if (!activeSocket) {
    return;
  }

  setStatus("Stopping", true);
  setStopState(false, "Stopping...");

  if (activeSocket.readyState === WebSocket.OPEN) {
    activeSocket.send(JSON.stringify({ type: "stop" }));
    return;
  }

  activeSocket.close();
});

async function runViaHTTP(payload) {
  setStatus("Running", true);
  try {
    const res = await fetch(`/api/${currentMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    renderReport(data);
    setStatus("Done", false);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
    setStatus("Error", false);
  }
}

function buildPayload() {
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

  if (currentMode === "ping") {
    return {
      host,
      count: isNaN(count) ? 0 : count,
      interval_ms: isNaN(interval) ? 0 : interval,
      timeout_ms: isNaN(timeout) ? 0 : timeout,
      size: isNaN(size) ? 0 : size,
      ipv6: document.getElementById("ipv6").checked,
    };
  }

  const port = parseInt(portField.value, 10);
  return {
    host,
    port: isNaN(port) ? 0 : port,
    count: isNaN(count) ? 0 : count,
    interval_ms: isNaN(interval) ? 0 : interval,
    timeout_ms: isNaN(timeout) ? 0 : timeout,
  };
}

function renderReport(report) {
  renderSummaryFromSummary(report.summary, report.target, report.addr);
  resultsEl.innerHTML = "";
  report.results.forEach((r) => appendResult(r, report.addr));
}

function renderSummaryFromSummary(summary, target, addr) {
  if (!summary) {
    summaryEl.innerHTML = "";
    return;
  }
  const loss = typeof summary.loss === "number" ? summary.loss.toFixed(1) : summary.loss;
  summaryEl.innerHTML = `
    <div><strong>${target}</strong> (${addr || "-"})</div>
    <div>${summary.sent} probes, ${summary.recv} replies, ${loss}% loss</div>
    ${summary.min ? `<div>RTT min/avg/max/stddev = ${summary.min}/${summary.avg}/${summary.max}/${summary.stddev}</div>` : ""}
  `;
}

function appendResult(result, fallbackAddr, ts) {
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

  const rttMs = result.rtt_ms;
  if (typeof rttMs === "number") {
    addChartPoint(ts || Date.now(), rttMs);
  }

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

async function loadHistory(payload) {
  chartLabel.textContent = "Realtime";
  if (!payload || !payload.host) {
    return;
  }
  const params = new URLSearchParams({
    type: currentMode,
    host: payload.host,
    limit: "120",
  });
  if (currentMode === "tcpping" && payload.port) {
    params.set("port", payload.port);
  }

  try {
    const res = await fetch(`/api/history?${params.toString()}`);
    if (!res.ok) {
      // Log error but don't block execution - use realtime only
      console.warn("Failed to load history:", res.status, res.statusText);
      return;
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      chartData = data.map((p) => ({ ts: p.ts, rtt: p.rtt_ms }));
      chartLabel.textContent = "History + Live";
      renderChart();
    }
  } catch (err) {
    // Log error but don't block execution - use realtime only
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

  const points = chartData.filter((p) => typeof p.rtt === "number");
  if (points.length === 0) {
    chartCtx.fillStyle = "rgba(148, 163, 184, 0.7)";
    chartCtx.font = "12px 'Space Grotesk', sans-serif";
    chartCtx.fillText("No data yet", 12, 24);
    return;
  }

  const padding = 16;
  const min = Math.min(...points.map((p) => p.rtt));
  const max = Math.max(...points.map((p) => p.rtt));
  const range = max - min || 1;

  const tMin = chartData[0].ts;
  const tMax = chartData[chartData.length - 1].ts || tMin + 1;

  chartCtx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  chartCtx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
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
  chartData.forEach((p) => {
    if (typeof p.rtt !== "number") {
      started = false;
      return;
    }
    const xRatio = tMax === tMin ? 1 : (p.ts - tMin) / (tMax - tMin);
    const x = padding + xRatio * (width - padding * 2);
    const y = padding + (1 - (p.rtt - min) / range) * (height - padding * 2);
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
