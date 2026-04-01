"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/api";
import { AlertRule, HistoryPoint, RecentHistoryTarget, RuntimeHealthResponse, SessionResponse } from "@/lib/types";
import { LiveTelemetrySample, subscribeLiveTelemetry } from "@/lib/live-telemetry";
import { Button } from "@/components/ui/button";
import { OverviewAlertSummary } from "@/features/overview/overview-alert-summary";
import {
  buildOverviewHealthDistribution,
  buildOverviewKpis,
  buildOverviewLatencySeries,
  buildOverviewTargetSnapshots,
  uniqueAlertTargets,
} from "@/features/overview/overview-helpers";
import { OverviewHealthDistributionPanel } from "@/features/overview/overview-health-distribution-panel";
import { OverviewKpiStrip } from "@/features/overview/overview-kpi-strip";
import { OverviewLatencyPanel } from "@/features/overview/overview-latency-panel";
import { OverviewLiveMonitorGrid } from "@/features/overview/overview-live-monitor-grid";
import { buildOverviewDemoData } from "@/features/overview/overview-demo-data";
import { OverviewTargetsTable } from "@/features/overview/overview-targets-table";

type ActiveTool = "icmp" | "tcp" | "portscan" | "dns";

const toolLabels: Record<ActiveTool, string> = {
  icmp: "ICMP Ping",
  tcp: "TCP Ping",
  portscan: "Port Scan",
  dns: "DNS Lookup",
};

function buildToolHref(tool: ActiveTool, target: string) {
  const value = target.trim();
  const params = new URLSearchParams();
  if (value) {
    params.set("target", value);
  }

  const query = params.toString();
  switch (tool) {
    case "tcp":
      return query ? `/tcp-ping?${query}` : "/tcp-ping";
    case "portscan":
      return query ? `/port-scan?${query}` : "/port-scan";
    case "dns":
      return query ? `/dns-lookup?${query}` : "/dns-lookup";
    default:
      return query ? `/icmp-ping?${query}` : "/icmp-ping";
  }
}

function mergeTrackedRules(alertRules: AlertRule[], recentTargets: RecentHistoryTarget[]) {
  const merged = new Map<string, AlertRule>();

  alertRules.forEach((rule) => {
    merged.set(`${rule.protocol}:${rule.target}:${rule.port ?? 0}`, rule);
  });

  recentTargets.forEach((target, index) => {
    const key = `${target.protocol}:${target.target}:${target.port ?? 0}`;
    if (merged.has(key)) {
      return;
    }

    merged.set(key, {
      id: -(index + 1),
      name: "",
      protocol: target.protocol,
      target: target.target,
      port: target.port ?? null,
      recipient_email: "",
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_recovery: false,
      enabled: true,
      last_state: "healthy",
      current_breach_streak: 0,
      created_at: new Date(target.last_sample_at).toISOString(),
    });
  });

  return Array.from(merged.values()).slice(0, 12);
}

function mergeTrackedRulesFromLiveSamples(rules: AlertRule[], liveSamples: LiveTelemetrySample[]) {
  const merged = new Map<string, AlertRule>();

  rules.forEach((rule) => {
    merged.set(`${rule.protocol}:${rule.target}:${rule.port ?? 0}`, rule);
  });

  liveSamples.forEach((sample, index) => {
    const key = `${sample.protocol}:${sample.target}:${sample.port ?? 0}`;
    if (merged.has(key)) {
      return;
    }

    merged.set(key, {
      id: -(1000 + index + 1),
      name: "",
      protocol: sample.protocol,
      target: sample.target,
      port: sample.port ?? null,
      recipient_email: "",
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_recovery: false,
      enabled: true,
      last_state: sample.error ? "alert" : "healthy",
      current_breach_streak: 0,
      created_at: new Date(sample.ts).toISOString(),
    });
  });

  return Array.from(merged.values()).slice(0, 12);
}

export function OverviewWorkspace() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<ActiveTool>("icmp");
  const [target, setTarget] = useState("");
  const [liveSamples, setLiveSamples] = useState<LiveTelemetrySample[]>([]);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return subscribeLiveTelemetry((sample) => {
      setLiveSamples((current) => [...current, sample].slice(-96));
    });
  }, []);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
    staleTime: 60_000,
  });
  const isDemo = sessionQuery.data?.read_only === true;
  const demoData = useMemo(() => buildOverviewDemoData(), []);

  const runtimeHealthQuery = useQuery({
    queryKey: ["runtime-health"],
    queryFn: () => apiRequest<RuntimeHealthResponse>("/api/healthz"),
    refetchInterval: 30_000,
  });

  const alertRulesQuery = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => apiRequest<AlertRule[]>("/api/alerts/rules"),
    refetchInterval: 20_000,
    enabled: sessionQuery.data?.authenticated === true && !isDemo,
  });

  const recentTargetsQuery = useQuery({
    queryKey: ["recent-history-targets"],
    queryFn: () => apiRequest<RecentHistoryTarget[]>("/api/history/recent-targets?limit=12"),
    refetchInterval: 20_000,
    enabled: sessionQuery.data?.authenticated === true && !isDemo,
  });

  const alertRulesSource = useMemo(
    () => (isDemo ? demoData.alertRules : alertRulesQuery.data ?? []),
    [alertRulesQuery.data, demoData.alertRules, isDemo],
  );
  const recentTargetsSource = useMemo(
    () => (isDemo ? demoData.recentTargets : recentTargetsQuery.data ?? []),
    [demoData.recentTargets, isDemo, recentTargetsQuery.data],
  );

  const trackedRules = useMemo(
    () => mergeTrackedRules(uniqueAlertTargets(alertRulesSource), recentTargetsSource),
    [alertRulesSource, recentTargetsSource],
  );
  const trackedRulesWithLive = useMemo(() => mergeTrackedRulesFromLiveSamples(trackedRules, liveSamples), [trackedRules, liveSamples]);

  const historyQueries = useQueries({
    queries: isDemo ? [] : trackedRulesWithLive.map((rule) => {
      const params = new URLSearchParams({
        type: rule.protocol,
        host: rule.target,
        limit: "24",
      });
      if (rule.protocol === "tcpping" && rule.port) {
        params.set("port", String(rule.port));
      }
      return {
        queryKey: ["overview-history", rule.protocol, rule.target, rule.port ?? 0],
        queryFn: () => apiRequest<HistoryPoint[]>(`/api/history?${params.toString()}`),
        refetchInterval: 20_000,
      };
    }),
  });

  const historyMap = useMemo(() => {
    if (isDemo) {
      return demoData.historyMap;
    }
    const map = new Map<string, HistoryPoint[]>();
    trackedRulesWithLive.forEach((rule, index) => {
      const key = `${rule.protocol}:${rule.target}:${rule.port ?? 0}`;
      map.set(key, historyQueries[index]?.data ?? []);
    });
    return map;
  }, [demoData.historyMap, historyQueries, isDemo, trackedRulesWithLive]);

  const liveSampleMap = useMemo(() => {
    const map = new Map<string, LiveTelemetrySample>();
    liveSamples.forEach((sample) => {
      map.set(`${sample.protocol}:${sample.target}:${sample.port ?? 0}`, sample);
    });
    return map;
  }, [liveSamples]);

  const targetSnapshots = useMemo(
    () =>
      buildOverviewTargetSnapshots(trackedRulesWithLive, historyMap, recentTargetsSource).map((snapshot) => {
        const liveSample = liveSampleMap.get(snapshot.id);
        if (!liveSample) {
          return snapshot;
        }
        return {
          ...snapshot,
          healthState:
            liveSample.error && snapshot.healthState !== "critical"
              ? "warning"
              : snapshot.healthState === "idle" && !liveSample.error
                ? "stable"
                : snapshot.healthState,
          lastSampleAt: Math.max(snapshot.lastSampleAt ?? 0, liveSample.ts),
          lastRttMs: liveSample.rttMs ?? snapshot.lastRttMs,
        };
      }),
    [trackedRulesWithLive, historyMap, recentTargetsSource, liveSampleMap],
  );
  const latencySeries = useMemo(() => {
    const livePoints = liveSamples
      .filter((sample) => typeof sample.rttMs === "number")
      .map((sample) => ({
        key: `${sample.protocol}:${sample.target}:${sample.port ?? 0}`,
        ts: sample.ts,
        rttMs: sample.rttMs,
      }));

    return [...buildOverviewLatencySeries(historyMap), ...livePoints]
      .sort((a, b) => a.ts - b.ts)
      .slice(-32);
  }, [historyMap, liveSamples]);
  const kpis = useMemo(
    () => buildOverviewKpis(trackedRulesWithLive, runtimeHealthQuery.data, targetSnapshots),
    [trackedRulesWithLive, runtimeHealthQuery.data, targetSnapshots],
  );
  const healthDistribution = useMemo(() => buildOverviewHealthDistribution(targetSnapshots), [targetSnapshots]);

  const latestRtt = useMemo(() => {
    const latestPoint = [...latencySeries].reverse().find((point) => typeof point.rttMs === "number");
    return typeof latestPoint?.rttMs === "number" ? latestPoint.rttMs : null;
  }, [latencySeries]);

  function runActiveTool() {
    router.push(buildToolHref(activeTool, target));
  }

  return (
    <div className="grid gap-6">
      <section className="dashboard-hero-panel rounded-[1.5rem] p-4 md:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">NetWatcher Control Plane</p>
              <h2 className="mt-1.5 font-space text-[1.6rem] font-bold leading-tight text-white sm:text-[1.8rem]">Network Operations Overview</h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="dashboard-chip transition hover:border-cyan-300/40 hover:bg-cyan-300/12"
                onClick={() => setActiveTool("icmp")}
              >
                {toolLabels[activeTool]}
              </button>
              <span className={runtimeHealthQuery.data?.ok ? "dashboard-chip dashboard-chip-success" : "dashboard-chip dashboard-chip-muted"}>
                {runtimeHealthQuery.data?.ok ? "Runtime Active" : "Runtime Check"}
              </span>
              <span className="dashboard-subtle-chip">{clock}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Set active target (e.g. 8.8.8.8)"
              className="dashboard-hero-input min-w-0 flex-1"
              disabled={isDemo}
            />
            <Button className="h-10 rounded-2xl px-5 text-sm" onClick={runActiveTool} disabled={isDemo}>
              {isDemo ? "Demo mode" : "Run Active Tool"}
            </Button>
            <div className="flex flex-wrap gap-1.5 xl:justify-end">
              <button type="button" className="dashboard-action-pill dashboard-action-pill-active" onClick={runActiveTool} disabled={isDemo}>
                Diagnostics
              </button>
              <button type="button" className="dashboard-action-pill" onClick={() => router.push("/history")} disabled={isDemo}>
                History
              </button>
              <button type="button" className="dashboard-action-pill" onClick={() => router.push("/alerts")} disabled={isDemo}>
                Alerts
              </button>
            </div>
          </div>

          {isDemo ? (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              Demo mode is active. This view is read-only and uses safe demo monitoring data.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1">
            {(["icmp", "tcp", "portscan", "dns"] as ActiveTool[]).map((tool) => (
              <button
                key={tool}
                type="button"
                className={tool === activeTool ? "dashboard-action-pill dashboard-action-pill-active" : "dashboard-action-pill"}
                onClick={() => setActiveTool(tool)}
              >
                {toolLabels[tool]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <OverviewKpiStrip
        trackedTargets={kpis.trackedTargets}
        critical={kpis.critical}
        warning={kpis.warning}
        stable={kpis.stable}
        liveStreams={kpis.liveStreams}
      />

      {(sessionQuery.isError || runtimeHealthQuery.isError || alertRulesQuery.isError || recentTargetsQuery.isError) && (
        <div className="rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-200">
          {[
            sessionQuery.error instanceof ApiError ? sessionQuery.error.message : null,
            runtimeHealthQuery.error instanceof ApiError ? runtimeHealthQuery.error.message : null,
            alertRulesQuery.error instanceof ApiError ? alertRulesQuery.error.message : null,
            recentTargetsQuery.error instanceof ApiError ? recentTargetsQuery.error.message : null,
          ]
            .filter(Boolean)
            .join(" | ")}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.95fr)]">
        <OverviewLatencyPanel points={latencySeries} />
        <OverviewHealthDistributionPanel
          items={healthDistribution}
          alertRuleCount={alertRulesSource.filter((rule) => rule.enabled).length}
          liveMonitorCount={kpis.liveStreams}
          lastRttMs={latestRtt}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.35fr)]">
        <OverviewAlertSummary critical={kpis.critical} warning={kpis.warning} stable={kpis.stable} />
        <OverviewTargetsTable targets={targetSnapshots} />
      </section>

      <OverviewLiveMonitorGrid targets={targetSnapshots} />
    </div>
  );
}
