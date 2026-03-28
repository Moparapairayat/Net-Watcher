"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OverviewTargetSnapshot, isOverviewTargetStreaming } from "@/features/overview/overview-helpers";
import { formatMs } from "@/lib/utils";

type OverviewTargetsTableProps = {
  targets: OverviewTargetSnapshot[];
};

function targetStatusTone(state: OverviewTargetSnapshot["healthState"]) {
  switch (state) {
    case "critical":
      return "border-rose-500/18 bg-rose-500/10 text-rose-200";
    case "warning":
      return "border-amber-500/18 bg-amber-500/10 text-amber-200";
    case "stable":
      return "border-emerald-500/18 bg-emerald-500/10 text-emerald-200";
    case "idle":
      return "border-cyan-500/18 bg-cyan-500/10 text-cyan-100";
    default:
      return "border-white/8 bg-white/[0.04] text-slate-300";
  }
}

function targetDotTone(state: OverviewTargetSnapshot["healthState"]) {
  switch (state) {
    case "critical":
      return "bg-rose-400";
    case "warning":
      return "bg-amber-400";
    case "stable":
      return "bg-emerald-400";
    case "idle":
      return "bg-sky-400";
    default:
      return "bg-white/30";
  }
}

export function OverviewTargetsTable({ targets }: OverviewTargetsTableProps) {
  const [now, setNow] = useState(() => Date.now());
  const rows = targets.slice(0, 5);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="dashboard-panel rounded-[1.5rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Target Table</p>
          <h3 className="mt-1.5 font-space text-[1.65rem] font-bold text-white">Top Targets</h3>
        </div>
        <Link href="/history" className="dashboard-text-link text-sm">
          Open history
        </Link>
      </div>

      <div className="dashboard-table dashboard-table-shell dashboard-table-compact mt-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Mode</th>
                <th>State</th>
                <th>Last RTT</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-sm text-slate-400">
                    No tracked targets yet. Add alert rules to populate the overview table.
                  </td>
                </tr>
              ) : (
                rows.map((target) => {
                  const isStreaming = isOverviewTargetStreaming(target.lastSampleAt, now);

                  return (
                    <tr key={target.id} className={isStreaming ? "dashboard-live-row" : undefined}>
                      <td data-label="Target">
                        <div className="flex items-center gap-2">
                          <span className={`dashboard-live-dot ${targetDotTone(target.healthState)} ${isStreaming ? "dashboard-live-dot-active" : ""}`} />
                          <Link href={target.href} className="dashboard-text-link">
                            {target.name}
                          </Link>
                        </div>
                      </td>
                      <td data-label="Mode">{target.protocol === "tcpping" ? "TCP Ping" : "ICMP Ping"}</td>
                      <td data-label="State">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${targetStatusTone(target.healthState)}`}>
                            {target.healthState}
                          </span>
                          {isStreaming ? <span className="dashboard-live-badge">Live</span> : null}
                        </div>
                      </td>
                      <td data-label="Last RTT">{typeof target.lastRttMs === "number" ? formatMs(target.lastRttMs) : "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
