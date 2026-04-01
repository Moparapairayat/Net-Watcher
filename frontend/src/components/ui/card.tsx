import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("rounded-xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_18px_45px_rgba(2,6,12,0.16)] backdrop-blur-sm", className)}>{children}</section>;
}
