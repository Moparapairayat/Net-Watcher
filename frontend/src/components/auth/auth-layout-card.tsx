import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthLayoutCard({
  title,
  subtitle,
  eyebrow,
  alternateHref,
  alternateLabel,
  showAlternateFooter = true,
  backdropClassName,
  shellClassName,
  contentClassName,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  alternateHref: string;
  alternateLabel: string;
  showAlternateFooter?: boolean;
  backdropClassName?: string;
  shellClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("auth-backdrop flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 sm:py-7", backdropClassName)}>
      <div className={cn("auth-shell w-full max-w-[27.75rem] overflow-hidden rounded-[1.35rem] px-5 py-5 sm:max-w-[32rem] sm:px-6 sm:py-6", shellClassName)}>
        <div className="auth-shell-topline" aria-hidden="true" />
        <div className="auth-brand-head">
          <div className="auth-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" className="h-10 w-10 sm:h-11 sm:w-11">
              <defs>
                <linearGradient id="nw-mark-stroke" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="#DDF8FF" />
                </linearGradient>
                <linearGradient id="nw-mark-accent" x1="14" y1="16" x2="50" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F6B847" />
                  <stop offset="1" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
              <path d="M14 18.5L26.5 30V47.5" stroke="url(#nw-mark-stroke)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M50 18.5L37.5 30V47.5" stroke="url(#nw-mark-stroke)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M32 12.5V47.5" stroke="url(#nw-mark-stroke)" strokeWidth="5.8" strokeLinecap="round" />
              <path d="M17 18.5H47" stroke="url(#nw-mark-accent)" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
              <circle cx="15.5" cy="18.5" r="3.3" fill="#F6B847" />
              <circle cx="48.5" cy="18.5" r="3.3" fill="#38BDF8" />
              <circle cx="32" cy="12.5" r="2.2" fill="#E6F7FF" opacity="0.9" />
            </svg>
          </div>
          <div className="auth-brand-copy">
            <p className="font-space text-[1.3rem] font-bold tracking-[-0.04em] text-white">NetWatcher</p>
            <p className="auth-brand-subline">Secure network operations</p>
          </div>
        </div>

        <div className="auth-heading-block text-center">
          <p className="auth-heading-eyebrow">{eyebrow}</p>
          <h1 className="auth-heading-title">{title}</h1>
          <p className="auth-heading-subtitle">{subtitle}</p>
        </div>

        <div className={cn("mt-6 sm:mt-7", contentClassName)}>{children}</div>

        {showAlternateFooter ? (
          <div className="auth-footer-note text-center">
            Need a different path?{" "}
            <Link className="auth-footer-link" href={alternateHref}>
              {alternateLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
