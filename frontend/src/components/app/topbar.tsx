"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Menu, Settings, User } from "lucide-react";
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

  const logout = useMutation({
    mutationFn: () => apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/login");
    },
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-nw-teal to-nw-gold font-display text-xs font-bold tracking-wider text-primary-foreground">
            NW
          </div>
          <div className="hidden items-baseline gap-2 sm:flex">
            <h1 className="font-display text-lg font-bold tracking-wide">
              <span className="text-gradient-brand">Net</span>
              <span className="text-gradient-teal">Watcher</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Network diagnostics cockpit</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setDropdownOpen((current) => !current)}
          className="flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-2 py-1.5 transition-all hover:border-primary/30"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-nw-teal to-nw-cyan text-[10px] font-bold tracking-wider text-primary-foreground">
            {(session.user?.name?.trim() || session.user?.email?.trim() || "OP").slice(0, 2).toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">▾</span>
        </button>

        {dropdownOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-52 animate-fade-in rounded-xl border border-border/50 bg-popover/95 p-2 shadow-xl backdrop-blur-lg">
              <div className="mb-1 border-b border-border/30 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{session.user?.name ?? "Operator"}</p>
                <p className="text-xs text-muted-foreground">{session.user?.email ?? "-"}</p>
              </div>
              <Link href="/settings" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary" onClick={() => setDropdownOpen(false)}>
                <Settings className="h-4 w-4 text-muted-foreground" /> Settings
              </Link>
              <Link href="/profile" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary" onClick={() => setDropdownOpen(false)}>
                <User className="h-4 w-4 text-muted-foreground" /> Profile
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-nw-red transition-colors hover:bg-destructive/10"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" /> {logout.isPending ? "Signing out..." : "Log Out"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
