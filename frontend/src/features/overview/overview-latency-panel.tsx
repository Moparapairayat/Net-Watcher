"use client";

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateTime, formatMs } from "@/lib/utils";

type OverviewLatencyPoint = {
  key: string;
  ts: number;
  rttMs: number | null;
};

type OverviewLatencyPanelProps = {
  points: OverviewLatencyPoint[];
};

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function OverviewLatencyPanel({ points }: OverviewLatencyPanelProps) {
  const values = points.flatMap((point) => (typeof point.rttMs === "number" ? [point.rttMs] : []));
  const peak = values.length > 0 ? Math.max(...values) : null;
  const floor = values.length > 0 ? Math.min(...values) : null;
  const medianValue = median(values);
  const chartData = points.map((point, index) => ({ ...point, label: `${index}s` }));
  const healthy = peak !== null && peak < 150;

  return (
    <div className="dashboard-panel rounded-[1.55rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Overview Pulse</p>
          <h3 className="mt-1.5 font-space text-[1.65rem] font-bold text-white">Network Response Timeline</h3>
        </div>
        <span className={healthy ? "dashboard-chip dashboard-chip-success" : "dashboard-chip dashboard-chip-muted"}>
          {healthy ? "Healthy" : "Monitoring"}
        </span>
      </div>

      <div className="mt-4 h-56 sm:h-60 xl:h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-400">
            No recent RTT samples yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="overviewLatencyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#44d4c8" stopOpacity={0.32} />
                  <stop offset="60%" stopColor="#1ea7b8" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#071019" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(87,157,196,0.14)" strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#7f93ac", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatMs(typeof value === "number" ? value : null)}
                tick={{ fill: "#7f93ac", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "rgba(68,212,200,0.22)", strokeWidth: 1 }}
                contentStyle={{
                  background: "rgba(8,14,23,0.96)",
                  border: "1px solid rgba(87,157,196,0.22)",
                  borderRadius: "16px",
                  color: "#e8f0ff",
                }}
                formatter={(value) => [formatMs(typeof value === "number" ? value : null), "RTT"]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as OverviewLatencyPoint | undefined;
                  return row ? `${row.key} • ${formatDateTime(row.ts)}` : "";
                }}
              />
              <Area
                type="monotone"
                dataKey="rttMs"
                stroke="#44d4c8"
                fill="url(#overviewLatencyFill)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={420}
                activeDot={{ r: 4, fill: "#f59e0b", stroke: "#071019", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 grid gap-3 border-t border-white/6 pt-3 sm:grid-cols-3">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Peak</p>
          <p className="mt-1.5 text-base font-semibold text-rose-300">{formatMs(peak)}</p>
        </div>
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Floor</p>
          <p className="mt-1.5 text-base font-semibold text-emerald-300">{formatMs(floor)}</p>
        </div>
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Median</p>
          <p className="mt-1.5 text-base font-semibold text-sky-300">{formatMs(medianValue)}</p>
        </div>
      </div>
    </div>
  );
}
