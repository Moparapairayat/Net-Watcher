import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-50/90",
        className,
      )}
    >
      {children}
    </span>
  );
}
