"use client";

import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { SessionResponse } from "@/lib/types";

export function GuestOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiRequest<SessionResponse>("/api/auth/session"),
  });

  useEffect(() => {
    if (!session.isLoading && session.data?.authenticated) {
      router.replace("/");
    }
  }, [router, session.data?.authenticated, session.isLoading]);

  if (session.isLoading) {
    return (
      <div className="grid-shell flex min-h-screen items-center justify-center px-6">
        <div className="surface w-full max-w-md rounded-3xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">NetWatcher</p>
          <h2 className="mt-3 font-space text-3xl font-bold text-white">Preparing access</h2>
          <p className="mt-2 text-sm text-slate-400">Checking whether an operator session already exists.</p>
        </div>
      </div>
    );
  }

  if (session.data?.authenticated) {
    return null;
  }

  return <>{children}</>;
}
