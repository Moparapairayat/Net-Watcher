import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  const useAuthVariant = className?.includes("auth-input");
  return <input ref={ref} className={cn(useAuthVariant ? "" : "field-input", className)} {...props} />;
});
