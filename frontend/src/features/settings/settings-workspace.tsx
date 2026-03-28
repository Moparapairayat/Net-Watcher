"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { apiRequest, ApiError } from "@/lib/api";
import { RuntimeHealthDependency, RuntimeHealthResponse, SessionResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function overallRuntimeMessage(runtimeHealth: RuntimeHealthResponse | undefined) {
  if (!runtimeHealth) {
    return "Checking database, cache, and object storage health.";
  }
  if (runtimeHealth.ok) {
    return "Database, cache, and object storage are online.";
  }
  return "One or more runtime dependencies need attention.";
}

function subscribeToOrigin() {
  return () => {};
}

function getOriginSnapshot() {
  return window.location.origin;
}

function getOriginServerSnapshot() {
  return "-";
}

function healthLabel(dependency: RuntimeHealthDependency) {
  if (!dependency.enabled) {
    return "Not configured";
  }
  return dependency.healthy ? "Healthy" : "Degraded";
}

function healthTone(dependency: RuntimeHealthDependency) {
  if (!dependency.enabled) {
    return "border-slate-800 bg-slate-950/60 text-slate-300";
  }
  return dependency.healthy
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-rose-500/30 bg-rose-500/10 text-rose-200";
}

function healthCopy(dependency: RuntimeHealthDependency) {
  if (!dependency.enabled) {
    return "Dependency is disabled in the current runtime.";
  }
  if (dependency.error) {
    return dependency.error;
  }
  if (dependency.driver) {
    return `Driver: ${dependency.driver}`;
  }
  return dependency.healthy ? "Dependency is responding normally." : "Dependency is enabled but not healthy.";
}

function RuntimeDependencyCard({ title, dependency }: { title: string; dependency: RuntimeHealthDependency }) {
  return (
    <article className="dashboard-panel-muted rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{healthLabel(dependency)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${healthTone(dependency)}`}>
          {healthLabel(dependency)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{healthCopy(dependency)}</p>
    </article>
  );
}

export function SettingsWorkspace() {
  const origin = useSyncExternalStore(subscribeToOrigin, getOriginSnapshot, getOriginServerSnapshot);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
  });

  const runtimeHealthQuery = useQuery({
    queryKey: ["runtime-health"],
    queryFn: () => apiRequest<RuntimeHealthResponse>("/api/healthz"),
  });

  const runtimeHealth = runtimeHealthQuery.data;
  const runtimeHealthy = runtimeHealth?.ok ?? false;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Runtime Settings</p>
        <h2 className="mt-2 font-space text-3xl font-bold text-white">Deployment Status</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Inspect runtime health, session state, and transport posture without leaving the monitoring workspace.
        </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void runtimeHealthQuery.refetch()}
            disabled={runtimeHealthQuery.isFetching}
          >
            <RefreshCw size={16} className="mr-2" />
            {runtimeHealthQuery.isFetching ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>

        {runtimeHealthQuery.isError && (
          <p className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {(runtimeHealthQuery.error as ApiError).message || "Unable to load runtime health."}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Origin</p>
            <p className="mt-3 break-all text-sm font-semibold text-white">{origin}</p>
          </div>
          <div className="dashboard-panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Runtime</p>
            <p className={`mt-3 text-lg font-semibold ${runtimeHealthy ? "text-emerald-300" : "text-white"}`}>
              {runtimeHealth ? (runtimeHealthy ? "Healthy" : "Degraded") : "Checking"}
            </p>
          </div>
          <div className="dashboard-panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Realtime</p>
            <p className="mt-3 text-lg font-semibold text-white">WebSocket + HTTP</p>
          </div>
          <div className="dashboard-panel-muted rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Session</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {sessionQuery.data?.authenticated ? "Active" : sessionQuery.isLoading ? "Checking" : "Locked"}
            </p>
          </div>
        </div>

        <div className="dashboard-note-panel mt-6 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Runtime Summary</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">{overallRuntimeMessage(runtimeHealth)}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last health check</p>
              <p className="mt-1">{runtimeHealth?.time ? formatDateTime(runtimeHealth.time) : "Waiting for response"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current operator</p>
              <p className="mt-1">{sessionQuery.data?.user?.email ?? "Not available"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Dependency Health</p>
          <h3 className="mt-2 font-space text-2xl font-bold text-white">Database, Cache, Object Storage</h3>
        </div>
        <div className="grid gap-4">
          <RuntimeDependencyCard title="Database" dependency={runtimeHealth?.database ?? { enabled: false, healthy: false }} />
          <RuntimeDependencyCard title="Redis Cache" dependency={runtimeHealth?.redis ?? { enabled: false, healthy: false }} />
          <RuntimeDependencyCard title="Object Storage" dependency={runtimeHealth?.object_storage ?? { enabled: false, healthy: false }} />
        </div>
      </Card>
    </div>
  );
}
