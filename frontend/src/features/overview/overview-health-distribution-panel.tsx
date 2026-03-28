"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { OverviewHealthDistributionItem } from "@/features/overview/overview-helpers";
import { formatMs } from "@/lib/utils";

type OverviewHealthDistributionPanelProps = {
  items: OverviewHealthDistributionItem[];
  alertRuleCount: number;
  liveMonitorCount: number;
  lastRttMs: number | null;
};

export function OverviewHealthDistributionPanel({
  items,
  alertRuleCount,
  liveMonitorCount,
  lastRttMs,
}: OverviewHealthDistributionPanelProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="dashboard-panel rounded-[1.55rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Live Command Summary</p>
          <h3 className="mt-1.5 font-space text-[1.65rem] font-bold leading-tight text-white">Target Health Distribution</h3>
        </div>
        <span className="dashboard-chip dashboard-chip-success">Session Active</span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(220px,0.86fr)_minmax(220px,1.14fr)] xl:items-center">
        <div className="relative h-52 sm:h-56">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
              No tracked target distribution yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="58%"
                    outerRadius="80%"
                    paddingAngle={3}
                    stroke="rgba(8,14,23,0.88)"
                    strokeWidth={4}
                  >
                    {items.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(8,14,23,0.96)",
                      border: "1px solid rgba(87,157,196,0.22)",
                      borderRadius: "16px",
                      color: "#e8f0ff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[1.75rem] font-bold text-white">{total}</span>
                <span className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">Targets</span>
              </div>
            </>
          )}
        </div>

        <div className="grid gap-2.5">
          {items.length === 0 ? (
            <div className="dashboard-panel-muted rounded-2xl p-4 text-sm text-slate-400">
              Add alert rules and collect telemetry to see health distribution.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-0.5">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[0.92rem] text-slate-300">{item.label}</span>
                </div>
                <strong className="text-base font-semibold text-white">{item.value}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-white/6 pt-4 sm:grid-cols-3">
        <div className="text-center sm:text-left">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Alert Rules</p>
          <p className="mt-1.5 text-[1.35rem] font-semibold text-[#63ddd3]">{alertRuleCount}</p>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Live Monitors</p>
          <p className="mt-1.5 text-[1.35rem] font-semibold text-[#63ddd3]">{liveMonitorCount}</p>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Last RTT</p>
          <p className="mt-1.5 text-[1.35rem] font-semibold text-[#63ddd3]">{formatMs(lastRttMs)}</p>
        </div>
      </div>
    </div>
  );
}
