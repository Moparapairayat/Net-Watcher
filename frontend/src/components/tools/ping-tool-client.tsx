"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProbeReport } from "@/lib/types";
import { ProbeRunState, useRealtimeProbe } from "@/hooks/use-realtime-probe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMs } from "@/lib/utils";

const pingSchema = z.object({
  host: z.string().min(1, "Target is required"),
  count: z.coerce.number().min(1).max(100),
  interval_ms: z.coerce.number().min(100).max(60000),
  timeout_ms: z.coerce.number().min(100).max(60000),
  size: z.coerce.number().min(8).max(1500),
  ipv6: z.boolean(),
});

const tcpSchema = z.object({
  host: z.string().min(1, "Target is required"),
  port: z.coerce.number().min(1).max(65535),
  count: z.coerce.number().min(1).max(100),
  interval_ms: z.coerce.number().min(100).max(60000),
  timeout_ms: z.coerce.number().min(100).max(60000),
});

type PingValues = z.infer<typeof pingSchema>;
type TCPValues = z.infer<typeof tcpSchema>;
type PingInput = z.input<typeof pingSchema>;
type TCPInput = z.input<typeof tcpSchema>;

function runStateLabel(state: ProbeRunState) {
  switch (state) {
    case "connecting":
      return "Connecting";
    case "running":
      return "Running";
    case "stopping":
      return "Stopping";
    case "done":
      return "Done";
    case "stopped":
      return "Stopped";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function statusTone(status: string) {
  return status === "ok" ? "bg-nw-mint/15 text-nw-mint" : "bg-nw-red/15 text-nw-red";
}

function summaryValue(value?: string | number | null, suffix = "") {
  if (typeof value === "number") {
    return `${value}${suffix}`;
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return "-";
}

function parseLatencyMs(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PingToolClient({ mode }: { mode: "ping" | "tcpping" }) {
  const isPing = mode === "ping";
  const schema = useMemo(() => (isPing ? pingSchema : tcpSchema), [isPing]);
  const form = useForm<PingInput | TCPInput, unknown, PingValues | TCPValues>({
    resolver: zodResolver(schema),
    defaultValues: isPing
      ? { host: "", count: 4, interval_ms: 1000, timeout_ms: 2000, size: 32, ipv6: false }
      : { host: "", port: 443, count: 4, interval_ms: 1000, timeout_ms: 2000 },
  });

  const { formError, report, run, runState, stop, isBusy } = useRealtimeProbe<PingValues | TCPValues>({
    type: isPing ? "ping" : "tcpping",
    httpPath: isPing ? "/api/ping" : "/api/tcpping",
    buildInitialReport: (values): ProbeReport => ({
      protocol: isPing ? "icmp" : "tcp",
      target: values.host,
      port: "port" in values && typeof values.port === "number" ? values.port : undefined,
      results: [],
      summary: {},
    }),
  });

  const summary = report?.summary;
  const label = isPing ? "ICMP Ping" : "TCP Ping";
  const protocolLabel = isPing ? "icmp" : "tcp";
  const latestResult = report?.results.at(-1);
  const latencyChartData = useMemo(() => {
    const results = (report?.results ?? []).slice(-20);

    return results.map((result, index) => {
      const rttMs = parseLatencyMs(result.rtt_ms ?? result.rtt);
      return {
        id: `${result.seq ?? index}-${result.addr ?? "na"}`,
        label: result.seq ?? index + 1,
        seq: result.seq ?? index + 1,
        rttMs,
        status: result.error ? "error" : "ok",
        text: result.rtt || (typeof result.rtt_ms === "number" ? formatMs(result.rtt_ms) : "timeout"),
      };
    });
  }, [report]);
  const latencyStats = useMemo(() => {
    const values = latencyChartData.flatMap((point) => (typeof point.rttMs === "number" ? [point.rttMs] : []));
    if (values.length === 0) {
      return { last: "-", peak: "-", floor: "-", average: "-", rawAverage: null as number | null, rawPeak: null as number | null };
    }
    const last = values[values.length - 1];
    const peak = Math.max(...values);
    const floor = Math.min(...values);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      last: formatMs(last),
      peak: formatMs(peak),
      floor: formatMs(floor),
      average: formatMs(average),
      rawAverage: average,
      rawPeak: peak,
    };
  }, [latencyChartData]);
  const latencyChartMax = useMemo(() => {
    if (typeof latencyStats.rawPeak !== "number") {
      return 100;
    }
    return Math.max(40, Math.ceil((latencyStats.rawPeak * 1.18) / 10) * 10);
  }, [latencyStats.rawPeak]);
  const latencyNoticeThreshold = useMemo(() => {
    if (typeof latencyStats.rawAverage !== "number") {
      return null;
    }
    return Math.max(20, Math.ceil((latencyStats.rawAverage * 1.45) / 5) * 5);
  }, [latencyStats.rawAverage]);
  const stats = [
    { label: "Events", value: String(report?.results.length ?? 0) },
    { label: "Signal", value: runStateLabel(runState).toLowerCase() },
    { label: "Last RTT", value: latestResult?.rtt || (typeof latestResult?.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "-") },
    { label: "Packet Loss", value: typeof summary?.loss === "number" ? `${summary.loss.toFixed(1)}%` : "-" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="dashboard-hero-panel rounded-[1.7rem] p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">{isPing ? "ICMP Echo" : "TCP Handshake"}</p>
            <h2 className="mt-1.5 font-space text-[1.75rem] font-bold text-white">{label}</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              {isPing
                ? "Run packet telemetry against a target host and inspect live response timing."
                : "Run port-aware handshake checks and inspect live connection timing."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="dashboard-chip">{label}</span>
            <span className={runState === "running" ? "dashboard-chip dashboard-chip-success" : "dashboard-chip dashboard-chip-muted"}>
              {runStateLabel(runState)}
            </span>
            <span className="dashboard-subtle-chip">{report?.target || form.getValues("host") || "No target selected"}</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => void run(values))}>
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Target Host</label>
              <Input className="dashboard-hero-input h-11 bg-white/[0.05]" placeholder="example.com or 8.8.8.8" {...form.register("host")} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="h-11 rounded-2xl px-5">{isBusy ? runStateLabel(runState) : `Run ${label}`}</Button>
              <Button type="button" variant="secondary" className="h-11 rounded-2xl" disabled={!isBusy} onClick={stop}>Stop</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {!isPing && (
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Port</label>
                <Input type="number" className="bg-white/[0.04]" {...form.register("port" as const, { valueAsNumber: true })} />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Count</label>
              <Input type="number" className="bg-white/[0.04]" {...form.register("count", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Interval (ms)</label>
              <Input type="number" className="bg-white/[0.04]" {...form.register("interval_ms", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Timeout (ms)</label>
              <Input type="number" className="bg-white/[0.04]" {...form.register("timeout_ms", { valueAsNumber: true })} />
            </div>
            {isPing && (
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-slate-500">Size</label>
                <Input type="number" className="bg-white/[0.04]" {...form.register("size", { valueAsNumber: true })} />
              </div>
            )}
          </div>

          {isPing ? (
            <label className="inline-flex items-center gap-3 text-sm text-slate-400">
              <input type="checkbox" {...form.register("ipv6")} />
              Force IPv6
            </label>
          ) : null}

          {formError ? <p className="rounded-lg border border-nw-red/30 bg-nw-red/10 px-4 py-3 text-sm text-nw-red">{formError}</p> : null}

          <p className="text-[10px] text-slate-500">
            {isPing ? "ICMP ping may require admin/root permission." : "TCP ping connects to the specified port."}
          </p>
        </form>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <article key={item.label} className="dashboard-card rounded-[1.2rem] px-4 py-3">
              <span className="block text-[0.62rem] uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
              <p className="mt-2 text-[1.15rem] font-semibold text-white">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="dashboard-panel rounded-[1.5rem] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-space text-[1.45rem] font-bold text-white">Latency (ms)</h3>
              <span className="dashboard-subtle-chip">Realtime</span>
            </div>

            {latencyChartData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-slate-400">
                Run a probe to populate the latency trace.
              </div>
            ) : (
              <div className="mt-4 h-56 sm:h-60 xl:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyChartData} margin={{ top: 12, right: 6, left: -14, bottom: 0 }}>
                    <CartesianGrid vertical stroke="rgba(64,103,131,0.18)" strokeDasharray="2 6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#7f93ac", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={10}
                    />
                    <YAxis
                      domain={[0, latencyChartMax]}
                      tickCount={5}
                      tickFormatter={(value) => formatMs(typeof value === "number" ? value : null)}
                      tick={{ fill: "#7f93ac", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    {typeof latencyNoticeThreshold === "number" ? (
                      <ReferenceLine
                        y={latencyNoticeThreshold}
                        stroke="rgba(245,158,11,0.28)"
                        strokeDasharray="5 6"
                        ifOverflow="extendDomain"
                      />
                    ) : null}
                    <Tooltip
                      cursor={{ stroke: "rgba(68,212,200,0.16)", strokeWidth: 1 }}
                      contentStyle={{
                        background: "rgba(5,12,20,0.98)",
                        border: "1px solid rgba(87,157,196,0.18)",
                        borderRadius: "14px",
                        color: "#e8f0ff",
                        boxShadow: "0 18px 42px rgba(2, 8, 16, 0.44)",
                      }}
                      formatter={(value) => [formatMs(typeof value === "number" ? value : null), "RTT"]}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { seq?: number; status?: string } | undefined;
                        return row ? `Probe ${row.seq ?? "-"} - ${row.status ?? "ok"}` : "";
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rttMs"
                      stroke="#4ee7de"
                      strokeWidth={2.4}
                      strokeLinecap="round"
                      dot={(props) => {
                        const { cx, cy, index, payload } = props as { cx?: number; cy?: number; index?: number; payload?: { rttMs?: number | null } };
                        if (
                          typeof cx !== "number" ||
                          typeof cy !== "number" ||
                          typeof index !== "number" ||
                          index !== latencyChartData.length - 1 ||
                          typeof payload?.rttMs !== "number"
                        ) {
                          return null;
                        }
                        return <circle cx={cx} cy={cy} r={4.5} fill="#f59e0b" stroke="#041019" strokeWidth={2.25} />;
                      }}
                      connectNulls={false}
                      isAnimationActive
                      animationDuration={360}
                      activeDot={{ r: 4, fill: "#f59e0b", stroke: "#041019", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-3 grid gap-3 border-t border-white/6 pt-3 sm:grid-cols-4">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Last</p>
                <p className="mt-1.5 text-base font-semibold text-[#63ddd3]">{latencyStats.last}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Peak</p>
                <p className="mt-1.5 text-base font-semibold text-rose-300">{latencyStats.peak}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Floor</p>
                <p className="mt-1.5 text-base font-semibold text-emerald-300">{latencyStats.floor}</p>
              </div>
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Average</p>
                <p className="mt-1.5 text-base font-semibold text-sky-300">{latencyStats.average}</p>
              </div>
            </div>
          </section>

          <section className="dashboard-panel rounded-[1.5rem] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-space text-[1.45rem] font-bold text-white">Results</h3>
              <span className="dashboard-subtle-chip">
                {runStateLabel(runState)}
              </span>
            </div>
            <div className="dashboard-table dashboard-table-shell dashboard-table-compact overflow-hidden">
              <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Status</th>
                    <th>RTT</th>
                    <th>Addr</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.results ?? []).map((result, index) => {
                    const status = result.error ? "error" : "ok";
                    return (
                      <tr key={`${result.seq ?? index}-${result.addr ?? "na"}`}>
                        <td className="font-mono text-foreground">{result.seq ?? index + 1}</td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(status)}`}>{status}</span>
                        </td>
                        <td className="font-mono text-foreground">
                          {result.rtt || (typeof result.rtt_ms === "number" ? formatMs(result.rtt_ms) : "-")}
                        </td>
                        <td className="font-mono text-slate-400">{result.addr || report?.addr || "-"}</td>
                      </tr>
                    );
                  })}
                  {report && report.results.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-400">Awaiting telemetry results.</td>
                    </tr>
                  ) : null}
                  {!report ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-400">Run a probe to populate results.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <article className="dashboard-panel rounded-[1.4rem] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-white">Run Context</span>
              <span className="dashboard-subtle-chip">{runStateLabel(runState).toLowerCase()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Target", value: report?.target || form.getValues("host") || "-" },
                { label: "Mode", value: label },
                { label: "Protocol", value: protocolLabel },
                { label: "Updated", value: latestResult ? "Live" : "Awaiting run" },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[9px] uppercase tracking-widest text-slate-500">{item.label}</span>
                  <p className="truncate text-xs font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel rounded-[1.4rem] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-white">Telemetry Summary</span>
              <span className="dashboard-subtle-chip">{runStateLabel(runState).toLowerCase()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Sent</span>
                <p className="mt-1 text-sm font-semibold text-white">{summaryValue(summary?.sent)}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Received</span>
                <p className="mt-1 text-sm font-semibold text-white">{summaryValue(summary?.recv)}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Loss</span>
                <p className="mt-1 text-sm font-semibold text-white">{typeof summary?.loss === "number" ? `${summary.loss.toFixed(1)}%` : "-"}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Duration</span>
                <p className="mt-1 text-sm font-semibold text-white">{summaryValue(summary?.duration)}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Min</span>
                <p className="mt-1 text-sm font-semibold text-white">{summaryValue(summary?.min)}</p>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-slate-500">Avg</span>
                <p className="mt-1 text-sm font-semibold text-white">{summaryValue(summary?.avg)}</p>
              </div>
            </div>
          </article>

          <article className="dashboard-panel rounded-[1.4rem] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-white">Latest Event</span>
              <span className="text-[10px] font-mono text-slate-500">live</span>
            </div>
            <p className="text-sm font-medium text-white">{latestResult ? (latestResult.error || "Probe reply received") : "Awaiting telemetry"}</p>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {latestResult ? `${latestResult.addr || report?.addr || report?.target || "-"} ${latestResult.rtt || (typeof latestResult.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "")}` : "Run a probe to stream live events."}
            </p>
          </article>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((item) => (
              <article key={item.label} className="dashboard-card rounded-[1rem] px-3 py-3 text-center">
                <span className="mb-0.5 block text-[9px] uppercase tracking-widest text-slate-500">{item.label}</span>
                <p className="text-sm font-bold text-white">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

