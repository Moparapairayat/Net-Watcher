"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest, ApiError } from "@/lib/api";
import { HistoryPoint } from "@/lib/types";
import { formatDateTime, formatMs } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const historyQuerySchema = z.object({
  type: z.enum(["ping", "tcpping"]),
  host: z.string().trim().min(1, "Target is required"),
  port: z.coerce.number().min(1, "Port must be between 1 and 65535").max(65535, "Port must be between 1 and 65535").optional(),
  limit: z.coerce.number().min(1, "Limit must be at least 1").max(1000, "Limit cannot exceed 1000"),
}).superRefine((value, ctx) => {
  if (value.type === "tcpping" && (!value.port || value.port < 1 || value.port > 65535)) {
    ctx.addIssue({
      code: "custom",
      path: ["port"],
      message: "Port is required for TCP Ping history",
    });
  }
});

type HistoryQueryInput = z.input<typeof historyQuerySchema>;
type HistoryQueryValues = z.output<typeof historyQuerySchema>;
type HistorySelection = {
  type: "ping" | "tcpping";
  host: string;
  port?: number;
  limit: number;
};

function fieldErrorText(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function buildHistoryQueryString(selection: HistorySelection) {
  const params = new URLSearchParams();
  params.set("type", selection.type);
  params.set("host", selection.host);
  params.set("limit", String(selection.limit));
  if (selection.type === "tcpping" && selection.port) {
    params.set("port", String(selection.port));
  }
  return params.toString();
}

function buildHistoryContextText(selection: HistorySelection | null) {
  if (!selection) {
    return "Enter a target to inspect stored probe history.";
  }
  if (selection.type === "tcpping") {
    return `Showing recent TCP Ping history for ${selection.host}:${selection.port}.`;
  }
  return `Showing recent ICMP Ping history for ${selection.host}.`;
}

function exportHistoryFileName(format: "json" | "csv", selection: HistorySelection) {
  const safeHost = selection.host.replace(/[:/\\\s]+/g, "_");
  if (selection.type === "tcpping" && selection.port) {
    return `${selection.type}_${safeHost}_${selection.port}.${format}`;
  }
  return `${selection.type}_${safeHost}.${format}`;
}

function extractDownloadFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
  if (!match || !match[1]) {
    return fallback;
  }
  return decodeURIComponent(match[1].replace(/^UTF-8''/i, "").replace(/\"/g, ""));
}

function computeHistorySummary(points: HistoryPoint[]) {
  let successfulPoints = 0;
  let totalRttMs = 0;

  for (const point of points) {
    if (typeof point.rtt_ms === "number") {
      successfulPoints += 1;
      totalRttMs += point.rtt_ms;
    }
  }

  return {
    totalPoints: points.length,
    successfulPoints,
    errorPoints: points.filter((point) => Boolean(point.error)).length,
    averageRttMs: successfulPoints > 0 ? totalRttMs / successfulPoints : null,
    latestPoint: points[0] ?? null,
  };
}

function parseSelectionFromSearchParams(searchParams: URLSearchParams): HistorySelection | null {
  const type = searchParams.get("type");
  const host = searchParams.get("host");
  if ((type !== "ping" && type !== "tcpping") || !host) {
    return null;
  }

  const limitValue = Number(searchParams.get("limit") || "120");
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 1000) : 120;
  const portValue = Number(searchParams.get("port") || "0");

  return {
    type,
    host,
    port: type === "tcpping" && Number.isFinite(portValue) && portValue > 0 ? portValue : undefined,
    limit,
  };
}

function HistoryMetricChart({ points }: { points: HistoryPoint[] }) {
  const chartData = points
    .filter((point) => typeof point.rtt_ms === "number")
    .map((point, index) => ({
      index: index + 1,
      time: formatDateTime(point.ts),
      rttMs: point.rtt_ms ?? null,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-sm text-slate-400">
        No RTT samples available yet for charting.
      </div>
    );
  }

  return (
    <div className="dashboard-note-panel h-64 p-4 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="historyLatencyStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#44d4c8" />
              <stop offset="65%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(87,157,196,0.14)" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(87,157,196,0.18)" }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value: number) => formatMs(value)}
            tickLine={false}
            axisLine={{ stroke: "rgba(87,157,196,0.18)" }}
          />
          <Tooltip
            cursor={{ stroke: "rgba(68,212,200,0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(8,14,23,0.96)",
              border: "1px solid rgba(87,157,196,0.22)",
              borderRadius: "16px",
              color: "#e8f0ff",
            }}
            formatter={(value) => [formatMs(typeof value === "number" ? value : null), "RTT"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ""}
          />
          <Line
            type="monotone"
            dataKey="rttMs"
            stroke="url(#historyLatencyStroke)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#f59e0b", stroke: "#071019", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistoryResultsTable({ points }: { points: HistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-10 text-sm text-slate-400">
        No stored points found for this target yet.
      </div>
    );
  }

  return (
    <div className="dashboard-table dashboard-table-shell">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Seq</th>
              <th>RTT</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={`${point.ts}-${point.seq ?? 0}`}>
                <td data-label="Time">{formatDateTime(point.ts)}</td>
                <td data-label="Seq">{point.seq ?? "-"}</td>
                <td data-label="RTT">{typeof point.rtt_ms === "number" ? formatMs(point.rtt_ms) : "-"}</td>
                <td data-label="Status">{point.error ? `Error: ${point.error}` : "OK"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HistoryWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoadDoneRef = useRef(false);

  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [selection, setSelection] = useState<HistorySelection | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"json" | "csv" | null>(null);

  const form = useForm<HistoryQueryInput, unknown, HistoryQueryValues>({
    resolver: zodResolver(historyQuerySchema),
    defaultValues: {
      type: "ping",
      host: "",
      port: 443,
      limit: 120,
    },
  });

  const mode = form.watch("type");

  const loadHistoryMutation = useMutation({
    mutationFn: (nextSelection: HistorySelection) =>
      apiRequest<HistoryPoint[]>(`/api/history?${buildHistoryQueryString(nextSelection)}`),
    onSuccess: (data, nextSelection) => {
      setRequestError(null);
      setPoints(data);
      setSelection(nextSelection);
      router.replace(`${pathname}?${buildHistoryQueryString(nextSelection)}`, { scroll: false });
    },
    onError: (error: ApiError) => {
      setRequestError(error.message);
      setPoints([]);
    },
  });

  const loadHistory = useCallback(async (values: HistoryQueryValues) => {
    const nextSelection: HistorySelection = {
      type: values.type,
      host: values.host,
      port: values.type === "tcpping" ? values.port : undefined,
      limit: values.limit,
    };
    await loadHistoryMutation.mutateAsync(nextSelection);
  }, [loadHistoryMutation]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      return;
    }
    initialLoadDoneRef.current = true;

    const nextSelection = parseSelectionFromSearchParams(new URLSearchParams(searchParams.toString()));
    if (!nextSelection) {
      return;
    }

    form.reset({
      type: nextSelection.type,
      host: nextSelection.host,
      port: nextSelection.port ?? 443,
      limit: nextSelection.limit,
    });
    void loadHistory({
      type: nextSelection.type,
      host: nextSelection.host,
      port: nextSelection.port,
      limit: nextSelection.limit,
    });
  }, [form, loadHistory, searchParams]);

  const summary = useMemo(() => computeHistorySummary(points), [points]);

  const handleExport = useCallback(async (format: "json" | "csv") => {
    if (!selection) {
      return;
    }

    setExportingFormat(format);
    setRequestError(null);

    try {
      const response = await fetch("/api/export/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          type: selection.type,
          host: selection.host,
          port: selection.port,
          limit: selection.limit,
          format,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        let message = "Unable to export history";
        if (contentType.includes("application/json")) {
          const payload = await response.json();
          if (payload && typeof payload === "object" && "error" in payload) {
            message = String((payload as { error?: string }).error || message);
          }
        } else {
          const text = await response.text();
          if (text) {
            message = text;
          }
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const downloadURL = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadURL;
      anchor.download = extractDownloadFileName(response, exportHistoryFileName(format, selection));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadURL);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to export history");
    } finally {
      setExportingFormat(null);
    }
  }, [selection]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Stored Telemetry</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">History Explorer</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Query stored ICMP and TCP Ping results, then export the same dataset as JSON or CSV from the monitoring console.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={form.handleSubmit((values) => void loadHistory(values))}>
          <div>
            <label className="field-label" htmlFor="history-type">Protocol</label>
            <select id="history-type" className="field-input" {...form.register("type")}>
              <option value="ping">ICMP Ping</option>
              <option value="tcpping">TCP Ping</option>
            </select>
            {fieldErrorText(form.formState.errors.type) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.type)}</p>}
          </div>

          <div>
            <label className="field-label" htmlFor="history-host">Target</label>
            <Input id="history-host" placeholder="example.com or 8.8.8.8" {...form.register("host")} />
            {fieldErrorText(form.formState.errors.host) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.host)}</p>}
          </div>

          {mode === "tcpping" && (
            <div>
              <label className="field-label" htmlFor="history-port">Port</label>
              <Input id="history-port" type="number" placeholder="443" {...form.register("port", { valueAsNumber: true })} />
              {fieldErrorText(form.formState.errors.port) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.port)}</p>}
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="history-limit">Limit</label>
            <Input id="history-limit" type="number" placeholder="120" {...form.register("limit", { valueAsNumber: true })} />
            {fieldErrorText(form.formState.errors.limit) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.limit)}</p>}
          </div>

          <Button type="submit" disabled={loadHistoryMutation.isPending}>{loadHistoryMutation.isPending ? "Loading..." : "Load History"}</Button>
        </form>

        <div className="dashboard-note-panel mt-6 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Selection Context</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{buildHistoryContextText(selection)}</p>
          {selection && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1">{selection.type === "tcpping" ? "TCP Ping" : "ICMP Ping"}</span>
              <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1">{selection.host}</span>
              {selection.type === "tcpping" && selection.port && (
                <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1">Port {selection.port}</span>
              )}
              <span className="rounded-full border border-teal-400/18 bg-slate-950/70 px-3 py-1">Limit {selection.limit}</span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">History Output</p>
            <h3 className="mt-2 font-space text-2xl font-bold text-white">Trend + Stored Points</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" disabled={!selection || exportingFormat !== null || loadHistoryMutation.isPending} onClick={() => void handleExport("json")}>
              {exportingFormat === "json" ? "Exporting JSON..." : "Export JSON"}
            </Button>
            <Button type="button" variant="secondary" disabled={!selection || exportingFormat !== null || loadHistoryMutation.isPending} onClick={() => void handleExport("csv")}>
              {exportingFormat === "csv" ? "Exporting CSV..." : "Export CSV"}
            </Button>
          </div>
        </div>

        {requestError && (
          <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {requestError}
          </p>
        )}

        {!selection && !loadHistoryMutation.isPending ? (
          <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-400">
            Load a target to inspect stored history and export the raw points.
          </p>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Points</p><p className="mt-3 text-lg font-semibold text-white">{summary.totalPoints}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Successful</p><p className="mt-3 text-lg font-semibold text-emerald-300">{summary.successfulPoints}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Errors</p><p className="mt-3 text-lg font-semibold text-white">{summary.errorPoints}</p></div>
              <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Average RTT</p><p className="mt-3 text-lg font-semibold text-white">{summary.averageRttMs === null ? "-" : formatMs(summary.averageRttMs)}</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
              <HistoryMetricChart points={points} />
              <div className="dashboard-panel-muted rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest Point</p>
                {summary.latestPoint ? (
                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Time</p>
                      <p className="mt-1 text-sm text-slate-200">{formatDateTime(summary.latestPoint.ts)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Seq</p>
                      <p className="mt-1 text-sm text-slate-200">{summary.latestPoint.seq ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">RTT</p>
                      <p className="mt-1 text-sm text-slate-200">{typeof summary.latestPoint.rtt_ms === "number" ? formatMs(summary.latestPoint.rtt_ms) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</p>
                      <p className="mt-1 text-sm text-slate-200">{summary.latestPoint.error ? `Error: ${summary.latestPoint.error}` : "OK"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">No stored points yet for the selected target.</p>
                )}
              </div>
            </div>

            <HistoryResultsTable points={points} />
          </div>
        )}
      </Card>
    </div>
  );
}
