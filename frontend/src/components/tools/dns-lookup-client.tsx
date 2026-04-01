"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, ApiError } from "@/lib/api";
import { DNSReport } from "@/lib/types";
import { formatMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  target: z.string().min(1, "Target is required"),
  timeout_ms: z.coerce.number().min(100).max(10000),
});

type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

function Section({ title, meta, items }: { title: string; meta: string; items: string[] }) {
  return (
    <div className="dashboard-panel-muted rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-space text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{meta}</p>
        </div>
        <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200">{items.length}</span>
      </div>
      <div className="grid gap-2">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-400">No records returned.</p>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-2xl border border-teal-400/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">{item}</div>
          ))
        )}
      </div>
    </div>
  );
}

export function DNSLookupClient() {
  const [report, setReport] = useState<DNSReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target: "",
      timeout_ms: 3000,
    },
  });

  const lookup = useMutation({
    mutationFn: (values: FormValues) => apiRequest<DNSReport>("/api/dnslookup", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (data) => {
      setFormError(null);
      setReport(data);
    },
    onError: (error: ApiError) => setFormError(error.message),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Resolver Intelligence</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">DNS Lookup / Reverse DNS</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">Inspect forward and reverse records from one dedicated resolver workspace.</p>
        <form className="mt-8 grid gap-4" onSubmit={form.handleSubmit((values) => lookup.mutate(values))}>
          <div>
            <label className="field-label" htmlFor="dns-target">Target</label>
            <Input id="dns-target" placeholder="example.com or 8.8.8.8" {...form.register("target")} />
          </div>
          <div>
            <label className="field-label" htmlFor="dns-timeout">Timeout (ms)</label>
            <Input id="dns-timeout" type="number" {...form.register("timeout_ms", { valueAsNumber: true })} />
          </div>
          {formError && <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          <Button type="submit" disabled={lookup.isPending}>{lookup.isPending ? "Resolving..." : "Run Lookup"}</Button>
        </form>
      </Card>
      <Card>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Lookup Summary</p>
            <h3 className="mt-2 font-space text-2xl font-bold text-white">Forward + Reverse Records</h3>
          </div>
          <span className="rounded-full border border-cyan-900/60 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">{report ? report.kind : "Idle"}</span>
        </div>
        {!report ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">Run a lookup to inspect A, AAAA, CNAME, NS, MX, TXT, and PTR data.</p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Target</p><p className="mt-3 text-lg font-semibold text-white">{report.target}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Kind</p><p className="mt-3 text-lg font-semibold text-white">{report.kind === "ip" ? "Reverse DNS" : "Host Lookup"}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Addresses</p><p className="mt-3 text-lg font-semibold text-white">{report.summary.addresses}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Duration</p><p className="mt-3 text-lg font-semibold text-white">{formatMs(report.summary.duration_ms)}</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="A Records" meta={formatMs(report.a.duration_ms)} items={report.a.values ?? []} />
              <Section title="AAAA Records" meta={formatMs(report.aaaa.duration_ms)} items={report.aaaa.values ?? []} />
              <Section title="CNAME" meta={formatMs(report.cname.duration_ms)} items={report.cname.values ?? []} />
              <Section title="NS Records" meta={formatMs(report.ns.duration_ms)} items={report.ns.values ?? []} />
              <Section title="MX Records" meta={formatMs(report.mx.duration_ms)} items={(report.mx.records ?? []).map((item) => `${item.pref} ${item.host}`)} />
              <Section title="TXT Records" meta={formatMs(report.txt.duration_ms)} items={report.txt.values ?? []} />
            </div>
            <Section title="PTR / Reverse DNS" meta={`${report.summary.reverse_lookups} names`} items={(report.ptr ?? []).flatMap((item) => (item.names ?? []).map((name) => `${item.address} -> ${name}`))} />
          </div>
        )}
      </Card>
    </div>
  );
}
