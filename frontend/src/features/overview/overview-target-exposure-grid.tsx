"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { OverviewTargetSnapshot } from "@/features/overview/overview-helpers";

type OverviewTargetExposureGridProps = {
  targets: OverviewTargetSnapshot[];
};

function targetTone(state: OverviewTargetSnapshot["healthState"]) {
  switch (state) {
    case "critical":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "stable":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "disabled":
      return "border-slate-700 bg-slate-900/80 text-slate-300";
    default:
      return "border-cyan-900/60 bg-slate-950/70 text-cyan-100";
  }
}

export function OverviewTargetExposureGrid({ targets }: OverviewTargetExposureGridProps) {
  const rows = targets.slice(0, 12);

  return (
    <div className="dashboard-panel rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Exposure Grid</p>
          <h3 className="mt-2 font-space text-2xl font-bold text-white">Live Targets</h3>
        </div>
        <span className="text-sm text-slate-400">{rows.length} visible cells</span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
          No monitored targets yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((target) => (
            <Link key={target.id} href={target.href}>
              <div
                className={cn(
                  "rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-teal-400/36",
                  targetTone(target.healthState),
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-75">
                      {target.protocol === "tcpping" ? "TCP Ping" : "ICMP Ping"}
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-white">{target.name}</h4>
                  </div>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-current opacity-90" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-70">State</p>
                    <p className="mt-1 font-medium capitalize text-white">{target.healthState}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-70">Samples</p>
                    <p className="mt-1 font-medium text-white">{target.pointCount}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
