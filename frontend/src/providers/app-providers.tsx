"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";
import { createQueryClient } from "@/lib/api";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
