import { ReactNode } from "react";
import Link from "next/link";

export function AuthLayoutCard({
  title,
  subtitle,
  eyebrow,
  alternateHref,
  alternateLabel,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  alternateHref: string;
  alternateLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="auth-shell w-full max-w-[72rem] overflow-hidden rounded-[1.5rem] lg:rounded-[2rem]">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <section className="auth-form-panel flex flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-11 lg:py-10">
            <div className="flex items-center gap-3">
              <div className="auth-brand-mark flex h-10 w-10 items-center justify-center rounded-xl font-space text-sm font-bold text-white">
                NW
              </div>
              <div>
                <p className="font-space text-[1.32rem] font-bold tracking-[-0.03em] text-slate-950">NetWatcher</p>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.3em] text-slate-500">Access</p>
              </div>
            </div>

            <div className="mt-9 max-w-[28rem] sm:mt-10">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-teal-800/80">{eyebrow}</p>
              <h1 className="mt-3 font-space text-[2.05rem] font-bold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-md text-[0.95rem] leading-7 text-slate-600">{subtitle}</p>
            </div>

            <div className="mt-8 max-w-[27rem]">{children}</div>

            <div className="mt-7 max-w-[27rem] border-t border-slate-200 pt-4 text-sm text-slate-500">
              Need a different path?{" "}
              <Link className="font-semibold text-teal-800 transition hover:text-teal-700" href={alternateHref}>
                {alternateLabel}
              </Link>
            </div>
          </section>

          <aside className="auth-brand-panel order-last flex flex-col justify-between px-5 py-6 text-white sm:px-8 sm:py-8 lg:order-none lg:px-11 lg:py-10">
            <div>
              <div className="auth-brand-chip">Private Access</div>
              <h2 className="mt-6 max-w-lg font-space text-[1.95rem] font-semibold leading-[1.05] tracking-[-0.05em] sm:text-[2.45rem] lg:mt-10 lg:text-[3.05rem]">
                A clean, premium entry point for your monitoring workspace.
              </h2>
              <p className="mt-4 max-w-md text-[0.96rem] leading-7 text-white/78">
                Focused access for diagnostics, alerts, and live target visibility without clutter.
              </p>

              <div className="auth-brand-rule mt-9" />
              <div className="mt-8 max-w-sm">
                <p className="auth-signal-label">NetWatcher Console</p>
                <p className="mt-3 text-[1rem] leading-7 text-white/86">
                  Designed for a calm, readable workflow across monitoring, history, and active investigation.
                </p>
              </div>
            </div>

            <div className="auth-brand-footer mt-8">
              <span>Secure session</span>
              <span>Verified access</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
