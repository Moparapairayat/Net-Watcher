"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const stats = [
    { label: "Events", value: String(report?.results.length ?? 0) },
    { label: "Signal", value: runStateLabel(runState).toLowerCase() },
    { label: "Last RTT", value: latestResult?.rtt || (typeof latestResult?.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "-") },
    { label: "Feed State", value: report ? "warm" : "cold" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{isPing ? "ICMP Echo" : "TCP Handshake"}</p>
            <h2 className="font-display text-xl font-bold text-foreground">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{runStateLabel(runState)}</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => void run(values))}>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Target Host</label>
              <Input placeholder="example.com or 8.8.8.8" {...form.register("host")} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="px-5">{isBusy ? runStateLabel(runState) : `Run ${label}`}</Button>
              <Button type="button" variant="secondary" disabled={!isBusy} onClick={stop}>Stop</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {!isPing && (
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Port</label>
                <Input type="number" {...form.register("port" as const, { valueAsNumber: true })} />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Count</label>
              <Input type="number" {...form.register("count", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Interval (ms)</label>
              <Input type="number" {...form.register("interval_ms", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Timeout (ms)</label>
              <Input type="number" {...form.register("timeout_ms", { valueAsNumber: true })} />
            </div>
            {isPing && (
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Size</label>
                <Input type="number" {...form.register("size", { valueAsNumber: true })} />
              </div>
            )}
          </div>

          {isPing ? (
            <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <input type="checkbox" {...form.register("ipv6")} />
              Force IPv6
            </label>
          ) : null}

          {formError ? <p className="rounded-lg border border-nw-red/30 bg-nw-red/10 px-4 py-3 text-sm text-nw-red">{formError}</p> : null}

          <p className="text-[10px] text-muted-foreground">
            {isPing ? "ICMP ping may require admin/root permission." : "TCP ping connects to the specified port."}
          </p>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Latency (ms)</h3>
              <span className="text-xs text-muted-foreground">Realtime</span>
            </div>
            <div className="rounded-lg bg-secondary/20 p-10 text-center text-sm text-muted-foreground">
              Live latency stream is active during probe execution.
            </div>
          </section>

          <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Results</h3>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                {runStateLabel(runState)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Seq</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">RTT</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Addr</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.results ?? []).map((result, index) => {
                    const status = result.error ? "error" : "ok";
                    return (
                      <tr key={`${result.seq ?? index}-${result.addr ?? "na"}`} className="border-b border-border/10">
                        <td className="py-2 font-mono text-foreground">{result.seq ?? index + 1}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(status)}`}>{status}</span>
                        </td>
                        <td className="py-2 font-mono text-foreground">
                          {result.rtt || (typeof result.rtt_ms === "number" ? formatMs(result.rtt_ms) : "-")}
                        </td>
                        <td className="py-2 font-mono text-muted-foreground">{result.addr || report?.addr || "-"}</td>
                      </tr>
                    );
                  })}
                  {report && report.results.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Awaiting telemetry results.</td>
                    </tr>
                  ) : null}
                  {!report ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Run a probe to populate results.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <article className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Run Context</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{runStateLabel(runState).toLowerCase()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Target", value: report?.target || form.getValues("host") || "-" },
                { label: "Mode", value: label },
                { label: "Protocol", value: protocolLabel },
                { label: "Updated", value: latestResult ? "Live" : "Awaiting run" },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{item.label}</span>
                  <p className="truncate text-xs font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Telemetry Summary</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{runStateLabel(runState).toLowerCase()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary ? `Sent ${summary.sent ?? 0}, received ${summary.recv ?? 0}, loss ${typeof summary.loss === "number" ? `${summary.loss.toFixed(1)}%` : "-"}.` : "Run a probe to stream live telemetry."}
            </p>
          </article>

          <article className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Latest Event</span>
              <span className="text-[10px] font-mono text-muted-foreground">live</span>
            </div>
            <p className="text-xs font-medium text-foreground">{latestResult ? (latestResult.error || "Probe reply received") : "Awaiting telemetry"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {latestResult ? `${latestResult.addr || report?.addr || report?.target || "-"} ${latestResult.rtt || (typeof latestResult.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "")}` : "Run a probe to stream live events."}
            </p>
          </article>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((item) => (
              <article key={item.label} className="rounded-lg border border-border/40 bg-card/60 p-3 text-center">
                <span className="mb-0.5 block text-[9px] uppercase tracking-widest text-muted-foreground">{item.label}</span>
                <p className="text-sm font-bold text-foreground">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
