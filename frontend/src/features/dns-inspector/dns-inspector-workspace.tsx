"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, ApiError } from "@/lib/api";
import { DNSReport } from "@/lib/types";
import { formatMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const resolverOptions = [
  { value: "auto", label: "Auto Resolver" },
  { value: "cloudflare", label: "Cloudflare 1.1.1.1" },
  { value: "google", label: "Google 8.8.8.8" },
  { value: "quad9", label: "Quad9 9.9.9.9" },
  { value: "custom", label: "Custom Resolver" },
] as const;

const recordTypeOptions = ["all", "a", "aaaa", "cname", "ns", "mx", "txt", "dmarc", "soa", "srv", "caa", "dnskey", "ds", "rrsig", "ptr"] as const;
const recordSectionTypes = ["a", "aaaa", "cname", "ns", "mx", "txt", "dmarc", "soa", "srv", "caa", "dnskey", "ds", "rrsig"] as const;

const schema = z
  .object({
    target: z.string().trim().min(1, "Target is required"),
    timeout_ms: z.coerce.number().min(100).max(10000),
    record_type: z.enum(recordTypeOptions),
    resolver: z.enum(["auto", "cloudflare", "google", "quad9", "custom"]),
    custom_resolver: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.resolver === "custom" && !value.custom_resolver) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom resolver is required",
        path: ["custom_resolver"],
      });
    }
  });

type DNSLookupFormValues = z.output<typeof schema>;
type DNSLookupFormInput = z.input<typeof schema>;
type RecordItem = { value: string; ttl?: number };

function sectionError(report: DNSReport, sectionType: (typeof recordSectionTypes)[number]) {
  switch (sectionType) {
    case "a":
      return report.a.error;
    case "aaaa":
      return report.aaaa.error;
    case "cname":
      return report.cname.error;
    case "ns":
      return report.ns.error;
    case "mx":
      return report.mx.error;
    case "txt":
      return report.txt.error;
    case "dmarc":
      return report.dmarc.error;
    case "soa":
      return report.soa.error;
    case "srv":
      return report.srv.error;
    case "caa":
      return report.caa.error;
    case "dnskey":
      return report.dnskey.error;
    case "ds":
      return report.ds.error;
    case "rrsig":
      return report.rrsig.error;
  }
}

function queriedSectionCount(selectedType: string) {
  if (selectedType === "all") {
    return recordSectionTypes.length + 1;
  }
  if (selectedType === "ptr") {
    return 1;
  }
  return 1;
}

function failedSectionCount(report: DNSReport, selectedType: string) {
  if (selectedType === "ptr") {
    return (report.ptr ?? []).some((item) => item.error) ? 1 : 0;
  }
  if (selectedType !== "all") {
    return isVisibleSection(selectedType, "ptr")
      ? ((report.ptr ?? []).some((item) => item.error) ? 1 : 0)
      : (sectionError(report, selectedType as (typeof recordSectionTypes)[number]) ? 1 : 0);
  }

  let failed = recordSectionTypes.filter((section) => sectionError(report, section)).length;
  if ((report.ptr ?? []).some((item) => item.error)) {
    failed += 1;
  }
  return failed;
}

function sectionMeta(durationMs: number, resolver?: string, authoritative?: boolean, extra?: string) {
  const meta = [formatMs(durationMs)];
  if (resolver) {
    meta.push(`via ${resolver}`);
  }
  if (authoritative) {
    meta.push("AA");
  }
  if (extra) {
    meta.push(extra);
  }
  return meta.join(" - ");
}

function isVisibleSection(selectedType: string, sectionType: string) {
  return selectedType === "all" || selectedType === sectionType;
}

function postureChipClasses(isPositive: boolean) {
  return isPositive
    ? "rounded-full border border-emerald-400/25 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200"
    : "rounded-full border border-rose-400/25 bg-rose-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200";
}

function DNSRecordSection({
  title,
  meta,
  items,
  error,
}: {
  title: string;
  meta: string;
  items: RecordItem[];
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
            <div key={`${item.value}-${item.ttl ?? 0}`} className="flex items-start justify-between gap-3 rounded-2xl border border-teal-400/12 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
              <span className="break-all">{item.value}</span>
              {typeof item.ttl === "number" ? (
                <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  TTL {item.ttl}s
                </span>
              ) : null}
            </div>
          ))
        )}
        {error ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
        ) : null}
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
      record_type: "all",
      resolver: "auto",
      custom_resolver: "",
    },
  });

  const lookup = useMutation({
    mutationFn: (values: DNSLookupFormValues) => {
      const resolver = values.resolver === "custom" ? (values.custom_resolver ?? "").trim() : values.resolver;
      return apiRequest<DNSReport>("/api/dnslookup", {
        method: "POST",
        body: JSON.stringify({
          target: values.target,
          timeout_ms: values.timeout_ms,
          record_type: values.record_type,
          resolver,
        }),
      });
    },
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
    const effectiveSelectedType = report.record_type.toLowerCase();
    const totalSections = queriedSectionCount(effectiveSelectedType);
    const failedSections = failedSectionCount(report, effectiveSelectedType);
    const healthySections = totalSections - failedSections;
    return {
      healthySections,
      failedSections,
      totalSections,
      ptrCount: (report.ptr ?? []).reduce((total, item) => total + ((item.records?.length ?? item.names?.length) ?? 0), 0),
      srvCount: report.srv.records?.length ?? 0,
      caaCount: report.caa.records?.length ?? 0,
      auditMode: report.record_type === "ALL" ? "Complete" : "Partial",
    };
  }, [report]);

  const watchedRecordType = useWatch({ control: form.control, name: "record_type" });
  const watchedResolver = useWatch({ control: form.control, name: "resolver" });
  const selectedType = (report?.record_type ?? watchedRecordType ?? "all").toLowerCase();
  const showCustomResolver = watchedResolver === "custom";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Resolver Intelligence</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">DNS Inspector</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Query a full record set or a single record type against a specific resolver and inspect TTL, authority, and reverse-DNS results.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={form.handleSubmit((values) => lookup.mutate(values))}>
          <div>
            <label className="field-label" htmlFor="dns-target">Target</label>
            <Input id="dns-target" placeholder="example.com, 8.8.8.8, or _sip._tcp.example.com" {...form.register("target")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="dns-record-type">Record Type</label>
              <select id="dns-record-type" className="field-input" {...form.register("record_type")}>
                {recordTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="dns-timeout">Timeout (ms)</label>
              <Input id="dns-timeout" type="number" {...form.register("timeout_ms", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="dns-resolver">Resolver</label>
              <select id="dns-resolver" className="field-input" {...form.register("resolver")}>
                {resolverOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {showCustomResolver ? (
              <div>
                <label className="field-label" htmlFor="dns-custom-resolver">Custom Resolver</label>
                <Input id="dns-custom-resolver" placeholder="10.0.0.53 or 10.0.0.53:53" {...form.register("custom_resolver")} />
              </div>
            ) : null}
          </div>
          {formError ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}
          {form.formState.errors.custom_resolver?.message ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{form.formState.errors.custom_resolver.message}</p>
          ) : null}
          <Button type="submit" disabled={lookup.isPending}>{lookup.isPending ? "Resolving..." : "Run Lookup"}</Button>
        </form>

        <div className="dashboard-note-panel mt-6 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inspector Notes</p>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-slate-300">
            <li>- Use `ALL` for a complete pass or select one record type to isolate a problem faster.</li>
            <li>- Custom resolvers accept `host`, `IPv4`, `IPv6`, or `host:port`.</li>
            <li>- TTL and resolver source are shown per section to help with cache and propagation analysis.</li>
            <li>- Mail and DNSSEC posture cards are most useful when the query type is `ALL`.</li>
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
            Run a lookup to inspect address, routing, policy, resolver, TTL, and reverse-DNS data from the Go backend.
          </p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Target</p><p className="mt-3 text-lg font-semibold text-white break-all">{report.target}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Query</p><p className="mt-3 text-lg font-semibold text-white">{report.record_type}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resolver</p><p className="mt-3 text-lg font-semibold text-white break-all">{report.resolver}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Duration</p><p className="mt-3 text-lg font-semibold text-white">{formatMs(report.summary.duration_ms)}</p></div>
            </div>

            {summary ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Healthy Sections</p><p className="mt-3 text-lg font-semibold text-emerald-300">{summary.healthySections}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Failed Sections</p><p className="mt-3 text-lg font-semibold text-white">{summary.failedSections}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">PTR Names</p><p className="mt-3 text-lg font-semibold text-white">{summary.ptrCount}</p></div>
                <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total Records</p><p className="mt-3 text-lg font-semibold text-white">{report.summary.total_records}</p></div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="dashboard-panel-muted rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mail Posture</p>
                    <p className="mt-2 text-lg font-semibold text-white">{report.analysis.mail_ready ? "Mail-ready DNS" : "Mail policy incomplete"}</p>
                  </div>
                  <span className={postureChipClasses(report.analysis.mail_ready)}>{report.analysis.mail_ready ? "Ready" : "Review"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={postureChipClasses(report.analysis.mx_present)}>MX</span>
                  <span className={postureChipClasses(report.analysis.spf_present)}>SPF</span>
                  <span className={postureChipClasses(report.analysis.dmarc_present)}>DMARC</span>
                  <span className={postureChipClasses(report.analysis.caa_present)}>CAA</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {(summary?.auditMode ?? "Partial")} audit across {summary?.totalSections ?? 0} queried sections.
                </p>
              </div>

              <div className="dashboard-panel-muted rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Security Posture</p>
                    <p className="mt-2 text-lg font-semibold text-white">{report.analysis.dnssec_present ? "DNSSEC signals detected" : "No DNSSEC signals found"}</p>
                  </div>
                  <span className={postureChipClasses(report.analysis.dnssec_present)}>{report.analysis.dnssec_present ? "Observed" : "None"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={postureChipClasses(report.analysis.dnskey_present)}>DNSKEY</span>
                  <span className={postureChipClasses(report.analysis.ds_present)}>DS</span>
                  <span className={postureChipClasses(report.analysis.rrsig_present)}>RRSIG</span>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  Use `ALL`, `DNSKEY`, `DS`, and `RRSIG` together when validating delegation and signing posture.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {isVisibleSection(selectedType, "a") ? <DNSRecordSection title="A Records" meta={sectionMeta(report.a.duration_ms, report.a.resolver, report.a.authoritative)} items={(report.a.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.a.error} /> : null}
              {isVisibleSection(selectedType, "aaaa") ? <DNSRecordSection title="AAAA Records" meta={sectionMeta(report.aaaa.duration_ms, report.aaaa.resolver, report.aaaa.authoritative)} items={(report.aaaa.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.aaaa.error} /> : null}
              {isVisibleSection(selectedType, "cname") ? <DNSRecordSection title="CNAME" meta={sectionMeta(report.cname.duration_ms, report.cname.resolver, report.cname.authoritative)} items={(report.cname.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.cname.error} /> : null}
              {isVisibleSection(selectedType, "ns") ? <DNSRecordSection title="NS Records" meta={sectionMeta(report.ns.duration_ms, report.ns.resolver, report.ns.authoritative)} items={(report.ns.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.ns.error} /> : null}
              {isVisibleSection(selectedType, "mx") ? <DNSRecordSection title="MX Records" meta={sectionMeta(report.mx.duration_ms, report.mx.resolver, report.mx.authoritative)} items={(report.mx.records ?? []).map((item) => ({ value: `${item.pref} ${item.host}`, ttl: item.ttl }))} error={report.mx.error} /> : null}
              {isVisibleSection(selectedType, "txt") ? <DNSRecordSection title="TXT Records" meta={sectionMeta(report.txt.duration_ms, report.txt.resolver, report.txt.authoritative)} items={(report.txt.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.txt.error} /> : null}
              {isVisibleSection(selectedType, "dmarc") ? <DNSRecordSection title="DMARC Records" meta={sectionMeta(report.dmarc.duration_ms, report.dmarc.resolver, report.dmarc.authoritative)} items={(report.dmarc.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.dmarc.error} /> : null}
              {isVisibleSection(selectedType, "soa") ? <DNSRecordSection title="SOA Record" meta={sectionMeta(report.soa.duration_ms, report.soa.resolver, report.soa.authoritative)} items={report.soa.record ? [{ value: `${report.soa.record.ns} | ${report.soa.record.mbox} | serial ${report.soa.record.serial} | refresh ${report.soa.record.refresh}`, ttl: report.soa.record.ttl }] : []} error={report.soa.error} /> : null}
              {isVisibleSection(selectedType, "srv") ? <DNSRecordSection title="SRV Records" meta={sectionMeta(report.srv.duration_ms, report.srv.resolver, report.srv.authoritative, `${summary?.srvCount ?? 0} records`)} items={(report.srv.records ?? []).map((item) => ({ value: `${item.priority} ${item.weight} ${item.port} ${item.target}`, ttl: item.ttl }))} error={report.srv.error} /> : null}
              {isVisibleSection(selectedType, "caa") ? <DNSRecordSection title="CAA Records" meta={sectionMeta(report.caa.duration_ms, report.caa.resolver, report.caa.authoritative, `${summary?.caaCount ?? 0} records`)} items={(report.caa.records ?? []).map((item) => ({ value: `flag=${item.flag} ${item.tag} ${item.value}`, ttl: item.ttl }))} error={report.caa.error} /> : null}
              {isVisibleSection(selectedType, "dnskey") ? <DNSRecordSection title="DNSKEY Records" meta={sectionMeta(report.dnskey.duration_ms, report.dnskey.resolver, report.dnskey.authoritative)} items={(report.dnskey.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.dnskey.error} /> : null}
              {isVisibleSection(selectedType, "ds") ? <DNSRecordSection title="DS Records" meta={sectionMeta(report.ds.duration_ms, report.ds.resolver, report.ds.authoritative)} items={(report.ds.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.ds.error} /> : null}
              {isVisibleSection(selectedType, "rrsig") ? <DNSRecordSection title="RRSIG Records" meta={sectionMeta(report.rrsig.duration_ms, report.rrsig.resolver, report.rrsig.authoritative)} items={(report.rrsig.records ?? []).map((item) => ({ value: item.value, ttl: item.ttl }))} error={report.rrsig.error} /> : null}
            </div>

            {(selectedType === "all" || selectedType === "ptr") ? (
              <DNSRecordSection
                title="PTR / Reverse DNS"
                meta={`${report.summary.reverse_lookups} names`}
                items={(report.ptr ?? []).flatMap((item) => (item.records ?? []).map((record) => ({ value: `${item.address} -> ${record.value}`, ttl: record.ttl })))}
                error={(report.ptr ?? []).find((item) => item.error)?.error}
              />
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
