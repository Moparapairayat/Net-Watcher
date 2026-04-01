import { AlertRule, HistoryPoint, RecentHistoryTarget, RuntimeHealthResponse } from "@/lib/types";

export type OverviewTargetHealthState = "critical" | "warning" | "stable" | "disabled" | "idle";
export const OVERVIEW_STREAMING_WINDOW_MS = 15_000;

export type OverviewTargetSnapshot = {
  id: string;
  name: string;
  protocol: "ping" | "tcpping";
  host: string;
  port?: number | null;
  ruleName: string;
  alertState: string;
  healthState: OverviewTargetHealthState;
  lastSampleAt?: number | null;
  lastRttMs?: number | null;
  latestPoint?: HistoryPoint | null;
  pointCount: number;
  href: string;
};

export type OverviewHealthDistributionItem = {
  label: string;
  value: number;
  color: string;
  tone: OverviewTargetHealthState;
};

export type OverviewDependencySnapshot = {
  label: string;
  state: "healthy" | "degraded" | "disabled";
  score: number;
  copy: string;
};

export type OverviewActivityEntry = {
  id: string;
  ts: number;
  tone: "critical" | "warning" | "stable" | "info";
  title: string;
  copy: string;
  href: string;
};

function buildToolHref(protocol: "ping" | "tcpping", host: string, port?: number | null) {
  const params = new URLSearchParams({ target: host });
  if (protocol === "tcpping" && port) {
    params.set("port", String(port));
    return `/tcp-ping?${params.toString()}`;
  }
  return `/icmp-ping?${params.toString()}`;
}

function parseTimestamp(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isOverviewTargetStreaming(lastSampleAt?: number | null, now = Date.now()) {
  if (!lastSampleAt) {
    return false;
  }
  return now - lastSampleAt <= OVERVIEW_STREAMING_WINDOW_MS;
}

function classifyTargetHealthState(rule: AlertRule, latestPoint: HistoryPoint | null, pointCount: number): OverviewTargetHealthState {
  if (!rule.enabled) {
    return "disabled";
  }
  if (rule.last_state === "alert") {
    return "critical";
  }
  if (!latestPoint || pointCount === 0) {
    return "idle";
  }
  if (latestPoint.error) {
    return "warning";
  }
  return "stable";
}

export function uniqueAlertTargets(rules: AlertRule[]) {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.protocol}:${rule.target}:${rule.port ?? 0}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function buildOverviewTargetSnapshots(
  rules: AlertRule[],
  historyMap: Map<string, HistoryPoint[]>,
  recentTargets: RecentHistoryTarget[] = [],
): OverviewTargetSnapshot[] {
  const recentTargetMap = new Map<string, RecentHistoryTarget>();
  recentTargets.forEach((target) => {
    recentTargetMap.set(`${target.protocol}:${target.target}:${target.port ?? 0}`, target);
  });

  return uniqueAlertTargets(rules)
    .map((rule) => {
      const key = `${rule.protocol}:${rule.target}:${rule.port ?? 0}`;
      const points = historyMap.get(key) ?? [];
      const recentTarget = recentTargetMap.get(key);
      const latestPoint = points.length > 0 ? points[points.length - 1] : null;
      const healthState = classifyTargetHealthState(rule, latestPoint, points.length);

      return {
        id: key,
        name: rule.protocol === "tcpping" && rule.port ? `${rule.target}:${rule.port}` : rule.target,
        protocol: rule.protocol,
        host: rule.target,
        port: rule.port ?? null,
        ruleName: rule.name || rule.target,
        alertState: rule.enabled ? rule.last_state || "healthy" : "disabled",
        healthState,
        latestPoint,
        lastSampleAt: latestPoint?.ts ?? recentTarget?.last_sample_at ?? null,
        lastRttMs: typeof latestPoint?.rtt_ms === "number" ? latestPoint.rtt_ms : null,
        pointCount: points.length,
        href: buildToolHref(rule.protocol, rule.target, rule.port),
      };
    })
    .sort((a, b) => (b.lastSampleAt ?? 0) - (a.lastSampleAt ?? 0));
}

export function buildOverviewLatencySeries(historyMap: Map<string, HistoryPoint[]>) {
  return Array.from(historyMap.entries())
    .flatMap(([key, points]) =>
      points.map((point) => ({
        key,
        ts: point.ts,
        rttMs: typeof point.rtt_ms === "number" ? point.rtt_ms : null,
      })),
    )
    .filter((entry) => typeof entry.rttMs === "number")
    .sort((a, b) => a.ts - b.ts)
    .slice(-32);
}

export function buildOverviewKpis(rules: AlertRule[], runtimeHealth: RuntimeHealthResponse | undefined, targets: OverviewTargetSnapshot[]) {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const critical = targets.filter((target) => target.healthState === "critical").length;
  const warning = targets.filter((target) => target.healthState === "warning" || target.healthState === "idle").length;
  const stable = targets.filter((target) => target.healthState === "stable").length;
  const runtime = runtimeHealth?.ok === true ? "Healthy" : runtimeHealth?.ok === false ? "Degraded" : "Checking";
  const liveStreams = targets.filter((target) => isOverviewTargetStreaming(target.lastSampleAt)).length;

  return {
    trackedTargets: uniqueAlertTargets(enabledRules).length,
    critical,
    warning,
    stable,
    runtime,
    liveStreams,
  };
}

export function buildOverviewHealthDistribution(targets: OverviewTargetSnapshot[]): OverviewHealthDistributionItem[] {
  const counts: Record<OverviewTargetHealthState, number> = {
    critical: 0,
    warning: 0,
    stable: 0,
    disabled: 0,
    idle: 0,
  };

  targets.forEach((target) => {
    counts[target.healthState] += 1;
  });

  const items: OverviewHealthDistributionItem[] = [
    { label: "Critical", value: counts.critical, color: "#ff5fd2", tone: "critical" },
    { label: "Warning", value: counts.warning, color: "#f8b033", tone: "warning" },
    { label: "Stable", value: counts.stable, color: "#63f3ff", tone: "stable" },
    { label: "Idle", value: counts.idle, color: "#4c7dff", tone: "idle" },
    { label: "Disabled", value: counts.disabled, color: "#94a3b8", tone: "disabled" },
  ];

  return items.filter((item) => item.value > 0);
}

export function buildOverviewDependencySnapshots(runtimeHealth?: RuntimeHealthResponse): OverviewDependencySnapshot[] {
  if (!runtimeHealth) {
    return [
      { label: "Database", state: "disabled", score: 0, copy: "Awaiting health check" },
      { label: "Redis", state: "disabled", score: 0, copy: "Awaiting health check" },
      { label: "Object Storage", state: "disabled", score: 0, copy: "Awaiting health check" },
    ];
  }

  const entries = [
    ["Database", runtimeHealth.database],
    ["Redis", runtimeHealth.redis],
    ["Object Storage", runtimeHealth.object_storage],
  ] as const;

  return entries.map(([label, dependency]) => {
    if (!dependency.enabled) {
      return { label, state: "disabled" as const, score: 25, copy: "Disabled" };
    }
    if (dependency.healthy) {
      return { label, state: "healthy" as const, score: 100, copy: "Healthy" };
    }
    return { label, state: "degraded" as const, score: 55, copy: dependency.error || "Degraded" };
  });
}

export function buildOverviewActivityEntries(rules: AlertRule[], targets: OverviewTargetSnapshot[]): OverviewActivityEntry[] {
  const entries: OverviewActivityEntry[] = [];

  rules.forEach((rule) => {
    const href = buildToolHref(rule.protocol, rule.target, rule.port);
    const targetLabel = rule.port ? `${rule.target}:${rule.port}` : rule.target;

    if (rule.last_triggered_at) {
      entries.push({
        id: `triggered:${rule.id}`,
        ts: parseTimestamp(rule.last_triggered_at),
        tone: "critical",
        title: "Threshold triggered",
        copy: `${rule.name || targetLabel} entered alert state.`,
        href,
      });
    }
    if (rule.last_recovered_at) {
      entries.push({
        id: `recovered:${rule.id}`,
        ts: parseTimestamp(rule.last_recovered_at),
        tone: "stable",
        title: "Rule recovered",
        copy: `${rule.name || targetLabel} returned to a healthy state.`,
        href,
      });
    }
    if (rule.last_evaluated_at) {
      entries.push({
        id: `evaluated:${rule.id}`,
        ts: parseTimestamp(rule.last_evaluated_at),
        tone: "info",
        title: "Rule evaluated",
        copy: `${rule.name || targetLabel} was evaluated by the alert engine.`,
        href,
      });
    }
  });

  targets.forEach((target) => {
    if (!target.lastSampleAt) {
      return;
    }
    if (target.latestPoint?.error) {
      entries.push({
        id: `target-error:${target.id}`,
        ts: parseTimestamp(target.lastSampleAt),
        tone: "warning",
        title: "Probe error observed",
        copy: `${target.name} returned ${target.latestPoint.error}.`,
        href: target.href,
      });
      return;
    }
    if (typeof target.lastRttMs === "number") {
      entries.push({
        id: `target-rtt:${target.id}`,
        ts: parseTimestamp(target.lastSampleAt),
        tone: "info",
        title: "Fresh telemetry sample",
        copy: `${target.name} responded in ${target.lastRttMs.toFixed(1)}ms.`,
        href: target.href,
      });
    }
  });

  return entries
    .filter((entry) => entry.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8);
}
