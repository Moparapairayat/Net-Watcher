"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { ProbeReport, ProbeStreamEvent } from "@/lib/types";
import { publishLiveTelemetry } from "@/lib/live-telemetry";

export type ProbeRunState =
  | "idle"
  | "connecting"
  | "running"
  | "stopping"
  | "done"
  | "stopped"
  | "error";

type RealtimeProbeConfig<TRequest extends Record<string, unknown>> = {
  type: "ping" | "tcpping" | "portscan";
  httpPath: string;
  buildInitialReport: (request: TRequest) => ProbeReport;
};

function getRealtimeWebSocketURL() {
  const explicit = process.env.NEXT_PUBLIC_NETWATCHER_WS_URL?.trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
}

function mergeStreamEvent(current: ProbeReport | null, fallback: ProbeReport, event: ProbeStreamEvent) {
  const base = current ?? fallback;

  if (event.type === "result" && event.result) {
    return {
      ...base,
      protocol: event.protocol ?? base.protocol,
      target: event.target ?? base.target,
      addr: event.result.addr ?? event.addr ?? base.addr,
      port: event.result.port ?? event.port ?? base.port,
      results: [...base.results, event.result],
    };
  }

  if ((event.type === "summary" || event.type === "stopped") && event.summary) {
    return {
      ...base,
      protocol: event.protocol ?? base.protocol,
      target: event.target ?? base.target,
      addr: event.addr ?? base.addr,
      port: event.port ?? base.port,
      summary: event.summary,
    };
  }

  return base;
}

function publishProbeResultTelemetry(protocol: "ping" | "tcpping" | "portscan", target: string, port: number | undefined, report: ProbeReport) {
  if (protocol === "portscan") {
    return;
  }
  report.results.forEach((result) => {
    publishLiveTelemetry({
      protocol,
      target,
      port,
      ts: Date.now(),
      rttMs: typeof result.rtt_ms === "number" ? result.rtt_ms : null,
      error: result.error,
      addr: result.addr,
    });
  });
}

export function useRealtimeProbe<TRequest extends Record<string, unknown>>(config: RealtimeProbeConfig<TRequest>) {
  const { type, httpPath, buildInitialReport } = config;
  const socketRef = useRef<WebSocket | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const runTokenRef = useRef(0);
  const mountedRef = useRef(true);

  const [report, setReport] = useState<ProbeReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [runState, setRunState] = useState<ProbeRunState>("idle");

  const clearActive = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    stopRequestedRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearActive();
    };
  }, [clearActive]);

  const runViaHTTP = useCallback(
    async (request: TRequest, initialReport: ProbeReport, runToken: number) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setRunState("running");

      try {
        const data = await apiRequest<ProbeReport>(httpPath, {
          method: "POST",
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        if (!mountedRef.current || runTokenRef.current !== runToken) {
          return;
        }
        publishProbeResultTelemetry(type, data.target, data.port, data);
        setReport(data);
        setRunState("done");
      } catch (error) {
        if (!mountedRef.current || runTokenRef.current !== runToken) {
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          setReport((current) => current ?? initialReport);
          setRunState("stopped");
          return;
        }

        const message = error instanceof ApiError ? error.message : "Request failed";
        setFormError(message);
        setRunState("error");
      } finally {
        abortRef.current = null;
      }
    },
    [httpPath, type],
  );

  const run = useCallback(
    async (request: TRequest) => {
      clearActive();
      const runToken = runTokenRef.current + 1;
      runTokenRef.current = runToken;
      setFormError(null);
      stopRequestedRef.current = false;

      const initialReport = buildInitialReport(request);
      setReport(initialReport);

      const wsURL = getRealtimeWebSocketURL();
      if (typeof window === "undefined" || !("WebSocket" in window) || !wsURL) {
        await runViaHTTP(request, initialReport, runToken);
        return;
      }

      const ws = new WebSocket(wsURL);
      socketRef.current = ws;

      let finished = false;
      let requestDispatched = false;
      let fallbackStarted = false;

      setRunState("connecting");

      ws.addEventListener("open", () => {
        setRunState("running");
        try {
          ws.send(JSON.stringify({ type, ...request }));
          requestDispatched = true;
        } catch {
          fallbackStarted = true;
          socketRef.current = null;
          ws.close();
          void runViaHTTP(request, initialReport, runToken);
        }
      });

      ws.addEventListener("message", (messageEvent) => {
        if (!mountedRef.current || runTokenRef.current !== runToken) {
          return;
        }
        const event = JSON.parse(messageEvent.data) as ProbeStreamEvent;
        if (event.type === "result") {
          if (type !== "portscan" && event.result) {
            publishLiveTelemetry({
              protocol: type,
              target: event.target ?? initialReport.target,
              port: event.result.port ?? event.port ?? initialReport.port,
              ts: typeof event.ts === "number" ? event.ts : Date.now(),
              rttMs: typeof event.result.rtt_ms === "number" ? event.result.rtt_ms : null,
              error: event.result.error,
              addr: event.result.addr ?? event.addr,
            });
          }
          setReport((current) => mergeStreamEvent(current, initialReport, event));
          return;
        }

        if (event.type === "summary" || event.type === "stopped") {
          finished = true;
          setReport((current) => mergeStreamEvent(current, initialReport, event));
          setRunState(event.type === "summary" ? "done" : "stopped");
          ws.close();
          return;
        }

        if (event.type === "error") {
          finished = true;
          setFormError(event.error || "Request failed");
          setRunState("error");
          ws.close();
        }
      });

      ws.addEventListener("error", () => {
        if (!mountedRef.current || runTokenRef.current !== runToken) {
          return;
        }
        if (!requestDispatched && !fallbackStarted) {
          fallbackStarted = true;
          socketRef.current = null;
          ws.close();
          void runViaHTTP(request, initialReport, runToken);
          return;
        }

        finished = true;
        setFormError("Realtime connection failed after the run started.");
        setRunState("error");
        ws.close();
      });

      ws.addEventListener("close", () => {
        if (!mountedRef.current || runTokenRef.current !== runToken) {
          return;
        }
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
        if (fallbackStarted || finished) {
          return;
        }
        if (stopRequestedRef.current) {
          setRunState("stopped");
          return;
        }
        if (requestDispatched) {
          setFormError("Connection closed before the run completed.");
          setRunState("error");
        }
      });
    },
    [buildInitialReport, clearActive, runViaHTTP, type],
  );

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    setRunState("stopping");

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "stop" }));
        return;
      }
      socketRef.current.close();
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  return {
    formError,
    report,
    run,
    runState,
    stop,
    isBusy: runState === "connecting" || runState === "running" || runState === "stopping",
  };
}
