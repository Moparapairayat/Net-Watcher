"use client";

import { useMemo, useState } from "react";
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
  target: z.string().trim().min(1, "Target is required"),
  timeout_ms: z.coerce.number().min(100).max(10000),
});

type DNSLookupFormValues = z.output<typeof schema>;
type DNSLookupFormInput = z.input<typeof schema>;

function countHealthySections(report: DNSReport) {
  const sections = [
    report.a.error,
    report.aaaa.error,
    report.cname.error,
    report.ns.error,
    report.mx.error,
    report.txt.error,
    report.soa.error,
    report.srv.error,
    report.caa.error,
  ];
  return sections.filter((item) => !item).length;
}

function DNSRecordSection({
  title,
  meta,
  items,
  error,
}: {
  title: string;
  meta: string;
  items: string[];
  error?: string;
}) {
  return (
    <div className="dashboard-panel-muted rounded-2xl p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-space text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{meta}</p>
        </div>
        <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200">
          {items.length}
        </span>
      </div>
      <div className="grid gap-2">
        {items.length === 0 && !error ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-4 text-sm text-slate-400">No records returned.</p>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-2xl border border-teal-400/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
              {item}
            </div>
          ))
        )}
        {error && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
        )}
      </div>
    </div>
  );
}

export function DNSInspectorWorkspace() {
  const [report, setReport] = useState<DNSReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<DNSLookupFormInput, unknown, DNSLookupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target: "",
      timeout_ms: 3000,
    },
  });

  const lookup = useMutation({
    mutationFn: (values: DNSLookupFormValues) =>
      apiRequest<DNSReport>("/api/dnslookup", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      setFormError(null);
      setReport(data);
    },
    onError: (error: ApiError) => setFormError(error.message),
  });

  const summary = useMemo(() => {
    if (!report) {
      return null;
    }
    const healthySections = countHealthySections(report);
    return {
      healthySections,
      failedSections: 9 - healthySections,
      ptrCount: (report.ptr ?? []).reduce((total, item) => total + (item.names?.length ?? 0), 0),
      srvCount: report.srv.records?.length ?? 0,
      caaCount: report.caa.records?.length ?? 0,
    };
  }, [report]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Resolver Intelligence</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">DNS Inspector</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Advanced DNS inspection with address, routing, service, policy, and reverse-DNS visibility in one place.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={form.handleSubmit((values) => lookup.mutate(values))}>
          <div>
            <label className="field-label" htmlFor="dns-target">Target</label>
            <Input id="dns-target" placeholder="example.com, 8.8.8.8, or _sip._tcp.example.com" {...form.register("target")} />
          </div>
          <div>
            <label className="field-label" htmlFor="dns-timeout">Timeout (ms)</label>
            <Input id="dns-timeout" type="number" {...form.register("timeout_ms", { valueAsNumber: true })} />
          </div>
          {formError && <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p>}
          <Button type="submit" disabled={lookup.isPending}>{lookup.isPending ? "Resolving..." : "Run Lookup"}</Button>
        </form>

        <div className="dashboard-note-panel mt-6 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inspector Notes</p>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-slate-300">
            <li>- Use a hostname for forward lookups and zone-level records.</li>
            <li>- Use an IP address for reverse DNS only.</li>
            <li>- Use a service label like `_sip._tcp.example.com` if you want meaningful SRV results.</li>
          </ul>
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Inspector Summary</p>
            <h3 className="mt-2 font-space text-2xl font-bold text-white">Forward, Reverse, and Policy Records</h3>
          </div>
          <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
            {report ? report.kind : "Idle"}
          </span>
        </div>

        {!report ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
            Run a lookup to inspect address, routing, policy, and reverse-DNS data from the Go backend.
          </p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Target</p><p className="mt-3 text-lg font-semibold text-white">{report.target}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Kind</p><p className="mt-3 text-lg font-semibold text-white">{report.kind === "ip" ? "Reverse DNS" : "Host Lookup"}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Records</p><p className="mt-3 text-lg font-semibold text-white">{report.summary.total_records}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Duration</p><p className="mt-3 text-lg font-semibold text-white">{formatMs(report.summary.duration_ms)}</p></div>
            </div>

            {summary && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Healthy Sections</p><p className="mt-3 text-lg font-semibold text-emerald-300">{summary.healthySections}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Failed Sections</p><p className="mt-3 text-lg font-semibold text-white">{summary.failedSections}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">PTR Names</p><p className="mt-3 text-lg font-semibold text-white">{summary.ptrCount}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Policy Records</p><p className="mt-3 text-lg font-semibold text-white">{summary.caaCount}</p></div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <DNSRecordSection title="A Records" meta={formatMs(report.a.duration_ms)} items={report.a.values ?? []} error={report.a.error} />
              <DNSRecordSection title="AAAA Records" meta={formatMs(report.aaaa.duration_ms)} items={report.aaaa.values ?? []} error={report.aaaa.error} />
              <DNSRecordSection title="CNAME" meta={formatMs(report.cname.duration_ms)} items={report.cname.values ?? []} error={report.cname.error} />
              <DNSRecordSection title="NS Records" meta={formatMs(report.ns.duration_ms)} items={report.ns.values ?? []} error={report.ns.error} />
              <DNSRecordSection title="MX Records" meta={formatMs(report.mx.duration_ms)} items={(report.mx.records ?? []).map((item) => `${item.pref} ${item.host}`)} error={report.mx.error} />
              <DNSRecordSection title="TXT Records" meta={formatMs(report.txt.duration_ms)} items={report.txt.values ?? []} error={report.txt.error} />
              <DNSRecordSection
                title="SOA Record"
                meta={formatMs(report.soa.duration_ms)}
                items={report.soa.record ? [`${report.soa.record.ns} | ${report.soa.record.mbox} | serial ${report.soa.record.serial} | refresh ${report.soa.record.refresh}`] : []}
                error={report.soa.error}
              />
              <DNSRecordSection
                title="SRV Records"
                meta={`${formatMs(report.srv.duration_ms)} - ${summary?.srvCount ?? 0} records`}
                items={(report.srv.records ?? []).map((item) => `${item.priority} ${item.weight} ${item.port} ${item.target}`)}
                error={report.srv.error}
              />
              <DNSRecordSection
                title="CAA Records"
                meta={`${formatMs(report.caa.duration_ms)} - ${summary?.caaCount ?? 0} records`}
                items={(report.caa.records ?? []).map((item) => `flag=${item.flag} ${item.tag} ${item.value}`)}
                error={report.caa.error}
              />
            </div>

            <DNSRecordSection
              title="PTR / Reverse DNS"
              meta={`${report.summary.reverse_lookups} names`}
              items={(report.ptr ?? []).flatMap((item) => (item.names ?? []).map((name) => `${item.address} -> ${name}`))}
              error={(report.ptr ?? []).find((item) => item.error)?.error}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
