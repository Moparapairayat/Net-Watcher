"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse, SessionResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function buildInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "NW").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileWorkspace() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
  });

  const sendResetEmail = useMutation({
    mutationFn: (email: string) =>
      apiRequest<AuthMessageResponse>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
  });

  const user = sessionQuery.data?.user;
  const verified = Boolean(user?.email_verified_at);
  const initials = buildInitials(user?.name, user?.email);

  return (
    <div className="grid gap-6">
      <section className="dashboard-hero-panel rounded-[1.7rem] p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,rgba(245,158,11,0.92),rgba(68,212,200,0.96),rgba(56,189,248,0.92))] text-lg font-bold text-slate-950 shadow-[0_18px_40px_rgba(2,6,12,0.26)]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Operator Profile</p>
              <h2 className="mt-1.5 font-space text-[1.9rem] font-bold leading-tight text-white">
                {user?.name || "NetWatcher Operator"}
              </h2>
              <p className="mt-1 break-all text-sm text-slate-400">{user?.email || "Session identity unavailable."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={verified ? "dashboard-chip dashboard-chip-success" : "dashboard-chip dashboard-chip-muted"}>
                  {verified ? "Email Verified" : "Verification Pending"}
                </span>
                <span className="dashboard-subtle-chip">
                  Member since {user?.created_at ? formatDateTime(user.created_at) : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-2xl px-5"
              disabled={!user?.email || sendResetEmail.isPending}
              onClick={() => {
                if (user?.email) {
                  sendResetEmail.mutate(user.email);
                }
              }}
            >
              {sendResetEmail.isPending ? "Sending..." : "Send Reset Email"}
            </Button>
            <Link
              href="/alerts"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-teal-400/18 bg-white/[0.04] px-5 text-sm font-semibold text-slate-100 transition hover:border-teal-400/34 hover:bg-white/[0.07]"
            >
              Open Alerts
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
            >
              Settings
            </Link>
          </div>
        </div>
      </section>

      {sendResetEmail.isError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {(sendResetEmail.error as ApiError).message || "Unable to send reset email."}
        </div>
      ) : null}

      {sendResetEmail.isSuccess ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {sendResetEmail.data.message || "Password reset email issued."}
        </div>
      ) : null}

      {sessionQuery.isLoading ? (
        <div className="dashboard-panel rounded-[1.5rem] p-6 text-sm text-slate-400">Loading profile data.</div>
      ) : sessionQuery.isError ? (
        <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 px-5 py-6 text-sm text-rose-200">
          {(sessionQuery.error as ApiError).message || "Unable to load profile."}
        </div>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <div className="dashboard-panel rounded-[1.5rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Identity Snapshot</p>
                  <h3 className="mt-1.5 font-space text-[1.65rem] font-bold text-white">Account Details</h3>
                </div>
                <span className="dashboard-subtle-chip">{sessionQuery.data?.authenticated ? "Authenticated" : "Locked"}</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Name</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user?.name || "Operator"}</p>
                </div>
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Email</p>
                  <p className="mt-2 break-all text-lg font-semibold text-white">{user?.email || "-"}</p>
                </div>
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Verification</p>
                  <p className="mt-2 text-lg font-semibold text-white">{verified ? "Verified" : "Pending"}</p>
                  <p className="mt-1.5 text-sm text-slate-400">
                    {verified ? `Verified on ${formatDateTime(user?.email_verified_at ?? "")}` : "Email verification still required."}
                  </p>
                </div>
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Member Since</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user?.created_at ? formatDateTime(user.created_at) : "-"}</p>
                </div>
              </div>
            </div>

            <div className="dashboard-panel rounded-[1.5rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">Security Posture</p>
                  <h3 className="mt-1.5 font-space text-[1.65rem] font-bold text-white">Recovery & Access</h3>
                </div>
                <span className={verified ? "dashboard-chip dashboard-chip-success" : "dashboard-chip dashboard-chip-danger"}>
                  {verified ? "Protected" : "Needs Action"}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Session Source</p>
                  <p className="mt-2 text-lg font-semibold text-white">Go Backend Session</p>
                  <p className="mt-1.5 text-sm text-slate-400">Current identity is resolved from the signed session cookie and the active user record.</p>
                </div>
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Reset Flow</p>
                  <p className="mt-2 text-lg font-semibold text-white">Resend-backed Recovery</p>
                  <p className="mt-1.5 text-sm text-slate-400">Reset links are delivered through the existing email recovery pipeline.</p>
                </div>
                <div className="dashboard-panel-muted rounded-2xl p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">Recommended Action</p>
                  <p className="mt-2 text-lg font-semibold text-white">{verified ? "Monitor alert coverage" : "Complete verification"}</p>
                  <p className="mt-1.5 text-sm text-slate-400">
                    {verified ? "Review alert rules and keep recovery email access current." : "Verify the account to unlock the full authenticated flow."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="dashboard-card rounded-[1.35rem] px-4 py-3.5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Session State</p>
              <p className="mt-3 text-[1.55rem] font-semibold leading-none text-white">
                {sessionQuery.data?.authenticated ? "Authenticated" : "Locked"}
              </p>
              <p className="mt-2 text-[0.84rem] text-slate-400">Current dashboard access state.</p>
            </div>
            <div className="dashboard-card rounded-[1.35rem] px-4 py-3.5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Verification State</p>
              <p className="mt-3 text-[1.55rem] font-semibold leading-none text-white">{verified ? "Verified" : "Pending"}</p>
              <p className="mt-2 text-[0.84rem] text-slate-400">Email trust state for the operator account.</p>
            </div>
            <div className="dashboard-card rounded-[1.35rem] px-4 py-3.5">
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-slate-500">Recovery Channel</p>
              <p className="mt-3 text-[1.55rem] font-semibold leading-none text-white">Email</p>
              <p className="mt-2 text-[0.84rem] text-slate-400">Password reset and account recovery delivery.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
