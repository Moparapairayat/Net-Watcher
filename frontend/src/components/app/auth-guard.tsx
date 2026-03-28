"use client";

import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { SessionResponse } from "@/lib/types";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
  });

  useEffect(() => {
    if (!session.isLoading && !session.data?.authenticated) {
      router.replace("/login");
    }
  }, [router, session.data?.authenticated, session.isLoading]);

  if (session.isLoading) {
    return (
      <div className="dashboard-shell grid-shell flex min-h-screen items-center justify-center px-6">
        <div className="surface w-full max-w-md rounded-3xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">NetWatcher</p>
          <h2 className="mt-3 font-space text-3xl font-bold brand-gradient">Loading session</h2>
          <p className="mt-2 text-sm text-slate-400">Preparing your monitoring workspace.</p>
        </div>
      </div>
    );
  }

  if (!session.data?.authenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="bg-grid-overlay fixed inset-0 pointer-events-none z-0 opacity-25" />
      <div
        className="pointer-events-none fixed top-0 left-0 z-0 h-[400px] w-[600px]"
        style={{ background: "radial-gradient(ellipse at 10% -10%, hsl(174 54% 56% / 0.15), transparent 60%)" }}
      />
      <div
        className="pointer-events-none fixed top-0 right-0 z-0 h-[300px] w-[500px]"
        style={{ background: "radial-gradient(ellipse at 90% 0%, hsl(37 91% 50% / 0.1), transparent 60%)" }}
      />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar session={session.data} />
          <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
