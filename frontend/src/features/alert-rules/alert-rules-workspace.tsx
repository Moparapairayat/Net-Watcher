"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, ApiError } from "@/lib/api";
import { AlertRule, AlertRulePayload, SessionResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}, z.number().positive().optional());

const alertRuleSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().optional(),
  protocol: z.enum(["ping", "tcpping"]),
  target: z.string().trim().min(1, "Target is required"),
  port: optionalPositiveNumber,
  recipient_email: z.string().trim().email("Valid recipient email is required").optional(),
  latency_threshold_ms: optionalPositiveNumber,
  loss_threshold_percent: optionalPositiveNumber,
  consecutive_breaches: z.coerce.number().int().min(1).max(20),
  cooldown_minutes: z.coerce.number().int().min(1).max(1440),
  notify_on_recovery: z.boolean(),
  enabled: z.boolean(),
}).superRefine((value, ctx) => {
  if (value.protocol === "tcpping" && (!value.port || value.port < 1 || value.port > 65535)) {
    ctx.addIssue({
      code: "custom",
      path: ["port"],
      message: "Port is required for TCP Ping rules",
    });
  }
  if (!value.latency_threshold_ms && !value.loss_threshold_percent) {
    ctx.addIssue({
      code: "custom",
      path: ["latency_threshold_ms"],
      message: "Set at least one threshold: latency or loss",
    });
  }
});

type AlertRuleFormInput = z.input<typeof alertRuleSchema>;
type AlertRuleFormValues = z.output<typeof alertRuleSchema>;

function buildAlertRuleDefaultName(protocol: AlertRulePayload["protocol"], target: string, port?: number) {
  const base = protocol === "tcpping" ? "TCP" : "ICMP";
  if (protocol === "tcpping" && port) {
    return `${base} ${target}:${port}`;
  }
  return `${base} ${target}`;
}

function buildAlertRuleSubtitle(rule: AlertRule) {
  if (rule.protocol === "tcpping" && rule.port) {
    return `TCP Ping - ${rule.target}:${rule.port}`;
  }
  return `ICMP Ping - ${rule.target}`;
}

function buildAlertRuleStatusTone(rule: AlertRule) {
  if (!rule.enabled) {
    return "border-slate-700/80 bg-slate-900/80 text-slate-300";
  }
  if (rule.last_state === "alert") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function buildAlertRuleStatusLabel(rule: AlertRule) {
  if (!rule.enabled) {
    return "Disabled";
  }
  if (rule.last_state === "alert") {
    return "Alerting";
  }
  return "Healthy";
}

function fieldErrorText(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function alertRuleDefaults(editingRule: AlertRule | null, defaultRecipientEmail: string): AlertRuleFormInput {
  if (editingRule) {
    return {
      id: editingRule.id,
      name: editingRule.name || "",
      protocol: editingRule.protocol,
      target: editingRule.target,
      port: editingRule.port ?? undefined,
      recipient_email: editingRule.recipient_email || defaultRecipientEmail,
      latency_threshold_ms: editingRule.latency_threshold_ms ?? undefined,
      loss_threshold_percent: editingRule.loss_threshold_percent ?? undefined,
      consecutive_breaches: editingRule.consecutive_breaches,
      cooldown_minutes: editingRule.cooldown_minutes,
      notify_on_recovery: editingRule.notify_recovery,
      enabled: editingRule.enabled,
    };
  }

  return {
    id: undefined,
    name: "",
    protocol: "ping",
    target: "",
    port: 443,
    recipient_email: defaultRecipientEmail,
    latency_threshold_ms: undefined,
    loss_threshold_percent: undefined,
    consecutive_breaches: 1,
    cooldown_minutes: 30,
    notify_on_recovery: true,
    enabled: true,
  };
}

function AlertRuleForm({
  editingRule,
  defaultRecipientEmail,
  isBusy,
  onCancelEdit,
  onSubmitRule,
}: {
  editingRule: AlertRule | null;
  defaultRecipientEmail: string;
  isBusy: boolean;
  onCancelEdit: () => void;
  onSubmitRule: (payload: AlertRulePayload) => void;
}) {
  const form = useForm<AlertRuleFormInput, unknown, AlertRuleFormValues>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: alertRuleDefaults(editingRule, defaultRecipientEmail),
  });

  useEffect(() => {
    form.reset(alertRuleDefaults(editingRule, defaultRecipientEmail));
  }, [defaultRecipientEmail, editingRule, form]);

  const protocol = useWatch({ control: form.control, name: "protocol" });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        const payload: AlertRulePayload = {
          id: values.id,
          name: values.name?.trim() || buildAlertRuleDefaultName(values.protocol, values.target, values.port),
          protocol: values.protocol,
          target: values.target,
          port: values.protocol === "tcpping" ? values.port : undefined,
          recipient_email: values.recipient_email?.trim() || defaultRecipientEmail,
          latency_threshold_ms: values.latency_threshold_ms,
          loss_threshold_percent: values.loss_threshold_percent,
          consecutive_breaches: values.consecutive_breaches,
          cooldown_minutes: values.cooldown_minutes,
          notify_on_recovery: values.notify_on_recovery,
          enabled: values.enabled,
        };
        onSubmitRule(payload);
      })}
    >
      <div>
        <label className="field-label" htmlFor="alert-name">Rule Name</label>
        <Input id="alert-name" placeholder="ICMP example.com" {...form.register("name")} />
      </div>

      <div>
        <label className="field-label" htmlFor="alert-protocol">Protocol</label>
        <select id="alert-protocol" className="field-input" {...form.register("protocol")}>
          <option value="ping">ICMP Ping</option>
          <option value="tcpping">TCP Ping</option>
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="alert-target">Target</label>
        <Input id="alert-target" placeholder="example.com or 8.8.8.8" {...form.register("target")} />
        {fieldErrorText(form.formState.errors.target) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.target)}</p>}
      </div>

      {protocol === "tcpping" && (
        <div>
          <label className="field-label" htmlFor="alert-port">Port</label>
          <Input id="alert-port" type="number" placeholder="443" {...form.register("port", { valueAsNumber: true })} />
          {fieldErrorText(form.formState.errors.port) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.port)}</p>}
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="alert-email">Recipient Email</label>
        <Input id="alert-email" placeholder="ops@example.com" {...form.register("recipient_email")} />
        {fieldErrorText(form.formState.errors.recipient_email) && <p className="mt-2 text-sm text-rose-300">{fieldErrorText(form.formState.errors.recipient_email)}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="alert-latency">Latency Threshold (ms)</label>
          <Input id="alert-latency" type="number" placeholder="200" {...form.register("latency_threshold_ms", { valueAsNumber: true })} />
        </div>
        <div>
          <label className="field-label" htmlFor="alert-loss">Loss Threshold (%)</label>
          <Input id="alert-loss" type="number" placeholder="25" {...form.register("loss_threshold_percent", { valueAsNumber: true })} />
        </div>
      </div>
      {fieldErrorText(form.formState.errors.latency_threshold_ms) && (
        <p className="text-sm text-rose-300">{fieldErrorText(form.formState.errors.latency_threshold_ms)}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="alert-breaches">Consecutive Breaches</label>
          <Input id="alert-breaches" type="number" {...form.register("consecutive_breaches", { valueAsNumber: true })} />
        </div>
        <div>
          <label className="field-label" htmlFor="alert-cooldown">Cooldown (minutes)</label>
          <Input id="alert-cooldown" type="number" {...form.register("cooldown_minutes", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="dashboard-toggle-panel inline-flex items-center gap-3 px-4 py-3 text-sm text-slate-200">
          <input type="checkbox" {...form.register("notify_on_recovery")} />
          Notify on recovery
        </label>
        <label className="dashboard-toggle-panel inline-flex items-center gap-3 px-4 py-3 text-sm text-slate-200">
          <input type="checkbox" {...form.register("enabled")} />
          Rule enabled
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={isBusy}>{isBusy ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}</Button>
        {editingRule && (
          <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={isBusy}>
            Cancel Edit
          </Button>
        )}
      </div>
    </form>
  );
}

function AlertRuleList({
  rules,
  onEdit,
  onDelete,
  deletingRuleId,
}: {
  rules: AlertRule[];
  onEdit: (rule: AlertRule) => void;
  onDelete: (rule: AlertRule) => void;
  deletingRuleId?: number | null;
}) {
  if (rules.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 px-4 py-10 text-sm text-slate-400">
        No alert rules yet. Create one to evaluate latency and loss thresholds automatically after probe runs.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {rules.map((rule) => (
        <article key={rule.id} className="dashboard-panel-muted rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-space text-xl font-semibold text-white">{rule.name || buildAlertRuleSubtitle(rule)}</h3>
              <p className="mt-2 text-sm text-slate-400">{buildAlertRuleSubtitle(rule)}</p>
            </div>
            <Badge className={buildAlertRuleStatusTone(rule)}>{buildAlertRuleStatusLabel(rule)}</Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {typeof rule.latency_threshold_ms === "number" && <Badge>{`Latency >= ${rule.latency_threshold_ms}ms`}</Badge>}
            {typeof rule.loss_threshold_percent === "number" && <Badge>{`Loss >= ${rule.loss_threshold_percent}%`}</Badge>}
            <Badge>{rule.consecutive_breaches}x breach</Badge>
            <Badge>{rule.cooldown_minutes}m cooldown</Badge>
            <Badge>{rule.notify_recovery ? "Recovery on" : "Recovery off"}</Badge>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Recipient</p>
              <p className="mt-1">{rule.recipient_email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last Triggered</p>
              <p className="mt-1">{rule.last_triggered_at ? formatDateTime(rule.last_triggered_at) : "No alert fired yet"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last Recovered</p>
              <p className="mt-1">{rule.last_recovered_at ? formatDateTime(rule.last_recovered_at) : "No recovery yet"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</p>
              <p className="mt-1">{formatDateTime(rule.created_at)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => onEdit(rule)}>Edit</Button>
            <Button type="button" variant="danger" disabled={deletingRuleId === rule.id} onClick={() => onDelete(rule)}>
              {deletingRuleId === rule.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AlertRulesWorkspace() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
  });

  const alertRulesQuery = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => apiRequest<AlertRule[]>("/api/alerts/rules"),
  });

  const saveAlertRuleMutation = useMutation({
    mutationFn: (payload: AlertRulePayload) =>
      apiRequest<AlertRule>("/api/alerts/rules", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async (savedRule, payload) => {
      setNotice({
        type: "success",
        message: payload.id ? `Rule updated for ${savedRule.target}.` : `Rule saved for ${savedRule.target}.`,
      });
      setEditingRule(null);
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error: ApiError) => {
      setNotice({ type: "error", message: error.message });
    },
  });

  const deleteAlertRuleMutation = useMutation({
    mutationFn: async (rule: AlertRule) => {
      setDeletingRuleId(rule.id);
      return apiRequest<{ ok: boolean; id: number }>(`/api/alerts/rules?id=${encodeURIComponent(String(rule.id))}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      setNotice({ type: "success", message: "Rule deleted." });
      if (editingRule && deletingRuleId === editingRule.id) {
        setEditingRule(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    },
    onError: (error: ApiError) => {
      setNotice({ type: "error", message: error.message });
    },
    onSettled: () => {
      setDeletingRuleId(null);
    },
  });

  const ruleSummary = useMemo(() => {
    const rules = alertRulesQuery.data ?? [];
    return {
      total: rules.length,
      alerting: rules.filter((rule) => rule.last_state === "alert").length,
      healthy: rules.filter((rule) => rule.last_state !== "alert" && rule.enabled).length,
      disabled: rules.filter((rule) => !rule.enabled).length,
    };
  }, [alertRulesQuery.data]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Threshold Automation</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">Alert Rules</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Create latency and loss thresholds that the monitoring stack evaluates automatically after each ICMP Ping or TCP Ping run.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rules</p><p className="mt-3 text-lg font-semibold text-white">{ruleSummary.total}</p></div>
          <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Alerting</p><p className="mt-3 text-lg font-semibold text-rose-300">{ruleSummary.alerting}</p></div>
          <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Healthy</p><p className="mt-3 text-lg font-semibold text-emerald-300">{ruleSummary.healthy}</p></div>
          <div className="dashboard-panel-muted rounded-2xl p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Disabled</p><p className="mt-3 text-lg font-semibold text-white">{ruleSummary.disabled}</p></div>
        </div>

        {notice && (
          <p
            className={[
              "mt-6 rounded-2xl px-4 py-3 text-sm",
              notice.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border border-rose-500/30 bg-rose-500/10 text-rose-200",
            ].join(" ")}
          >
            {notice.message}
          </p>
        )}

        <div className="mt-6">
          <AlertRuleForm
            editingRule={editingRule}
            defaultRecipientEmail={sessionQuery.data?.user?.email ?? ""}
            isBusy={saveAlertRuleMutation.isPending}
            onCancelEdit={() => setEditingRule(null)}
            onSubmitRule={(payload) => {
              setNotice(null);
              saveAlertRuleMutation.mutate(payload);
            }}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Rule Inventory</p>
            <h3 className="mt-2 font-space text-2xl font-bold text-white">Saved Rules</h3>
          </div>
          {alertRulesQuery.data && alertRulesQuery.data.length > 0 && (
            <div className="text-right text-sm text-slate-400">
              <p>{alertRulesQuery.data.length} rule{alertRulesQuery.data.length === 1 ? "" : "s"}</p>
              <p>Updated {formatDateTime(alertRulesQuery.dataUpdatedAt)}</p>
            </div>
          )}
        </div>

        {alertRulesQuery.isLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-800 px-4 py-10 text-sm text-slate-400">
            Loading alert rules.
          </div>
        ) : alertRulesQuery.isError ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-10 text-sm text-rose-200">
            {(alertRulesQuery.error as ApiError).message || "Unable to load alert rules."}
          </div>
        ) : (
          <AlertRuleList
            rules={alertRulesQuery.data ?? []}
            deletingRuleId={deletingRuleId}
            onEdit={(rule) => {
              setNotice(null);
              setEditingRule(rule);
            }}
            onDelete={(rule) => {
              setNotice(null);
              deleteAlertRuleMutation.mutate(rule);
            }}
          />
        )}
      </Card>
    </div>
  );
}
