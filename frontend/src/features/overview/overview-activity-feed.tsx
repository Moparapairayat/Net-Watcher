"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { OverviewActivityEntry } from "@/features/overview/overview-helpers";

type OverviewActivityFeedProps = {
  entries: OverviewActivityEntry[];
};

function entryTone(tone: OverviewActivityEntry["tone"]) {
  switch (tone) {
    case "critical":
      return "border-rose-500/25 bg-rose-500/10";
    case "warning":
      return "border-amber-500/25 bg-amber-500/10";
    case "stable":
      return "border-emerald-500/25 bg-emerald-500/10";
    default:
      return "border-cyan-900/60 bg-slate-950/70";
  }
}

export function OverviewActivityFeed({ entries }: OverviewActivityFeedProps) {
  return (
    <div className="dashboard-panel rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recent Activity</p>
          <h3 className="mt-2 font-space text-2xl font-bold text-white">Live Feed</h3>
        </div>
        <span className="text-sm text-slate-400">{entries.length} events</span>
      </div>

      <div className="mt-5 grid gap-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
            No activity yet. Run probes or trigger alert evaluation to populate the feed.
          </div>
        ) : (
          entries.map((entry) => (
            <Link key={entry.id} href={entry.href}>
              <div className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${entryTone(entry.tone)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{entry.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{entry.copy}</p>
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {formatDateTime(entry.ts)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
