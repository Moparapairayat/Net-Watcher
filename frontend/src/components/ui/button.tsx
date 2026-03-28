import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-[#44d4c8] text-slate-950 shadow-[0_10px_28px_rgba(68,212,200,0.18)] hover:brightness-110",
  secondary: "border border-white/10 bg-white/[0.04] text-slate-200 hover:border-teal-300/28 hover:bg-white/[0.07]",
  ghost: "bg-transparent text-slate-200 hover:bg-white/6",
  danger: "border border-rose-500/30 bg-rose-500/12 text-rose-200 hover:bg-rose-500/18",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
