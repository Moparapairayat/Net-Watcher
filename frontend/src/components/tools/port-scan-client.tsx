"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProbeReport } from "@/lib/types";
import { ProbeRunState, useRealtimeProbe } from "@/hooks/use-realtime-probe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMs } from "@/lib/utils";

const schema = z.object({
  host: z.string().min(1, "Target is required"),
  ports: z.string().min(1, "Ports are required"),
  timeout_ms: z.coerce.number().min(100).max(60000),
  concurrency: z.coerce.number().min(1).max(256),
});

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

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

function stateTone(state?: string) {
  switch (state) {
    case "open":
      return "bg-nw-mint/15 text-nw-mint";
    case "closed":
      return "bg-secondary text-muted-foreground";
    default:
      return "bg-nw-gold/15 text-nw-gold";
  }
}

export function PortScanClient() {
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      host: "",
      ports: "22,80,443,8080",
      timeout_ms: 2000,
      concurrency: 64,
    },
  });

  const { formError, report, run, runState, stop, isBusy } = useRealtimeProbe<FormValues>({
    type: "portscan",
    httpPath: "/api/portscan",
    buildInitialReport: (values): ProbeReport => ({
      protocol: "tcp-portscan",
      target: values.host,
      results: [],
      summary: {},
    }),
  });

  const latestResult = report?.results.at(-1);

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Surface Mapping</p>
            <h2 className="font-display text-xl font-bold text-foreground">Port Scan</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{runStateLabel(runState)}</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit((values) => void run(values))}>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Target Host</label>
              <Input placeholder="example.com" {...form.register("host")} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="px-5">{isBusy ? runStateLabel(runState) : "Run Port Scan"}</Button>
              <Button type="button" variant="secondary" disabled={!isBusy} onClick={stop}>Stop</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Port Range</label>
              <Input placeholder="22,80,443,8080" {...form.register("ports")} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Timeout (ms)</label>
              <Input type="number" {...form.register("timeout_ms", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Concurrency</label>
              <Input type="number" {...form.register("concurrency", { valueAsNumber: true })} />
            </div>
          </div>

          {formError ? <p className="rounded-lg border border-nw-red/30 bg-nw-red/10 px-4 py-3 text-sm text-nw-red">{formError}</p> : null}

          <p className="text-[10px] text-muted-foreground">Scans the specified host using the provided port set or ranges.</p>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Exposure Summary</h3>
              <span className="text-xs text-muted-foreground">Realtime</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <article className="rounded-lg border border-border/40 bg-card/60 p-4 text-center">
                <span className="mb-0.5 block text-[9px] uppercase tracking-widest text-muted-foreground">Scanned</span>
                <p className="text-lg font-bold text-foreground">{report?.summary.scanned ?? 0}</p>
              </article>
              <article className="rounded-lg border border-border/40 bg-card/60 p-4 text-center">
                <span className="mb-0.5 block text-[9px] uppercase tracking-widest text-muted-foreground">Open</span>
                <p className="text-lg font-bold text-nw-mint">{report?.summary.open ?? 0}</p>
              </article>
              <article className="rounded-lg border border-border/40 bg-card/60 p-4 text-center">
                <span className="mb-0.5 block text-[9px] uppercase tracking-widest text-muted-foreground">Closed</span>
                <p className="text-lg font-bold text-foreground">{report?.summary.closed ?? 0}</p>
              </article>
            </div>
          </section>

          <section className="rounded-xl border border-border/40 bg-card/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground">Results</h3>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">{runStateLabel(runState)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Port</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">State</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">RTT</th>
                    <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.results ?? []).map((result, index) => (
                    <tr key={`${result.port ?? index}-${result.addr ?? "na"}`} className="border-b border-border/10">
                      <td className="py-2 font-mono text-foreground">{result.port ?? "-"}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${stateTone(result.state)}`}>{result.state || "closed"}</span>
                      </td>
                      <td className="py-2 font-mono text-foreground">
                        {result.rtt || (typeof result.rtt_ms === "number" ? formatMs(result.rtt_ms) : "-")}
                      </td>
                      <td className="py-2 font-mono text-muted-foreground">{result.addr || result.error || "-"}</td>
                    </tr>
                  ))}
                  {report && report.results.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Awaiting port results.</td>
                    </tr>
                  ) : null}
                  {!report ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Run a scan to populate results.</td>
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
                { label: "Ports", value: form.getValues("ports") || "-" },
                { label: "Protocol", value: "tcp" },
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
              <span className="text-xs font-medium text-foreground">Latest Event</span>
              <span className="text-[10px] font-mono text-muted-foreground">live</span>
            </div>
            <p className="text-xs font-medium text-foreground">{latestResult ? `${latestResult.port ?? "-"} ${latestResult.state || "closed"}` : "Awaiting telemetry"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {latestResult ? `${latestResult.addr || latestResult.error || "-"} ${latestResult.rtt || (typeof latestResult.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "")}` : "Run a scan to stream live events."}
            </p>
          </article>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Events", value: String(report?.results.length ?? 0) },
              { label: "Signal", value: runStateLabel(runState).toLowerCase() },
              { label: "Last RTT", value: latestResult?.rtt || (typeof latestResult?.rtt_ms === "number" ? formatMs(latestResult.rtt_ms) : "-") },
              { label: "Feed State", value: report ? "warm" : "cold" },
            ].map((item) => (
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
