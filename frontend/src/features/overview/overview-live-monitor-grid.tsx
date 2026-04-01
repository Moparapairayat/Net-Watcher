"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OverviewTargetSnapshot, isOverviewTargetStreaming } from "@/features/overview/overview-helpers";
import { formatMs } from "@/lib/utils";

type OverviewLiveMonitorGridProps = {
  targets: OverviewTargetSnapshot[];
};

function borderTone(state: OverviewTargetSnapshot["healthState"]) {
  switch (state) {
    case "critical":
      return "border-fuchsia-500/35";
    case "warning":
      return "border-amber-400/35";
    case "stable":
      return "border-cyan-400/35";
    default:
      return "border-blue-500/20";
  }
}

function dotTone(state: OverviewTargetSnapshot["healthState"]) {
  switch (state) {
    case "critical":
      return "bg-fuchsia-400";
    case "warning":
      return "bg-amber-400";
    case "stable":
      return "bg-cyan-300";
    default:
      return "bg-blue-400";
  }
}

function relativeTime(ts?: number | null, now = Date.now()) {
  if (!ts) return "No samples";
  const diff = Math.max(0, now - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function OverviewLiveMonitorGrid({ targets }: OverviewLiveMonitorGridProps) {
  const [now, setNow] = useState(() => Date.now());
  const rows = targets.slice(0, 4);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="dashboard-panel rounded-[1.5rem] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-space text-[1.45rem] font-bold text-white">Live Monitor Grid</h3>
          <p className="mt-0.5 text-[0.72rem] text-slate-400">Recent target activity with last state and latency.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
          No recent target activity yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((target) => {
            const isStreaming = isOverviewTargetStreaming(target.lastSampleAt, now);

            return (
              <Link
                key={target.id}
                href={target.href}
                className={`dashboard-live-card rounded-xl border bg-white/[0.03] p-3.5 transition hover:bg-white/[0.05] ${borderTone(target.healthState)} ${isStreaming ? "dashboard-live-card-active" : ""}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.82rem] font-medium text-white">{target.name}</span>
                  <span className={`dashboard-live-dot ${dotTone(target.healthState)} ${isStreaming ? "dashboard-live-dot-active" : ""}`} />
                </div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                    {target.protocol === "tcpping" ? `TCP${target.port ? `:${target.port}` : ""}` : "ICMP"}
                  </span>
                  <span className={isStreaming ? "dashboard-live-badge" : "dashboard-subtle-chip"}>
                    {isStreaming ? "Streaming" : relativeTime(target.lastSampleAt, now)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-slate-500">
                  <span className="font-mono text-slate-300">{typeof target.lastRttMs === "number" ? formatMs(target.lastRttMs) : "timeout"}</span>
                  <span className="ml-auto">{relativeTime(target.lastSampleAt, now)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
