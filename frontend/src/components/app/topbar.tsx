"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, LogOut, Menu, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { SessionResponse } from "@/lib/types";
import { useShellStore } from "@/store/ui-store";

export function Topbar({ session }: { session: SessionResponse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleSidebar } = useShellStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isDemo = session.mode === "demo";

  const logout = useMutation({
    mutationFn: () => apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/login");
    },
  });

  return (
    <header className="topbar-shell sticky top-0 z-20 flex h-14 items-center justify-between gap-3 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-cyan-300/8 hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(23,211,194,0.95),rgba(52,129,255,0.92),rgba(248,176,51,0.9))] font-display text-xs font-bold tracking-wider text-slate-950 shadow-[0_0_18px_rgba(64,240,255,0.18)]">
            NW
          </div>
          <div className="hidden items-baseline gap-2 sm:flex">
            <h1 className="font-display text-lg font-bold tracking-wide">
              <span className="brand-gradient">NetWatcher</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.14em] text-cyan-100/45">Network diagnostics cockpit</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        {isDemo ? (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
            Demo access
          </span>
        ) : null}

        <button
          onClick={() => setDropdownOpen((current) => !current)}
          className="flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-300/6 px-2 py-1.5 transition-all hover:border-cyan-300/28"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(23,211,194,0.96),rgba(52,129,255,0.96))] text-[10px] font-bold tracking-wider text-slate-950 shadow-[0_0_14px_rgba(64,240,255,0.16)]">
            {(session.user?.name?.trim() || session.user?.email?.trim() || "OP").slice(0, 2).toUpperCase()}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-cyan-100/60" />
        </button>

        {dropdownOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fade-in rounded-xl border border-cyan-300/14 bg-popover/95 p-2 shadow-xl backdrop-blur-lg">
              <div className="mb-1 border-b border-cyan-300/10 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{session.user?.name ?? "Operator"}</p>
                <p className="text-xs text-cyan-100/45">{session.user?.email ?? "-"}</p>
              </div>

              <Link href="/settings" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-cyan-300/8" onClick={() => setDropdownOpen(false)}>
                <Settings className="h-4 w-4 text-cyan-100/45" /> Settings
              </Link>
              <Link href="/profile" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-cyan-300/8" onClick={() => setDropdownOpen(false)}>
                <User className="h-4 w-4 text-cyan-100/45" /> Profile
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-nw-red transition-colors hover:bg-destructive/10"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" /> {logout.isPending ? "Signing out..." : isDemo ? "Exit Demo" : "Log Out"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
