import { ReactNode } from "react";
import { AuthGuard } from "@/components/app/auth-guard";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
