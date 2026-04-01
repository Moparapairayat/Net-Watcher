"use client";

import { InputHTMLAttributes, useMemo, useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthInputFieldProps = {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string;
  passwordToggle?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

export function AuthInputField({ id, label, icon: _icon, error, passwordToggle = false, inputProps }: AuthInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  void _icon;
  const { className, placeholder, type, ...restInputProps } = inputProps ?? {};
  const resolvedType = passwordToggle ? (showPassword ? "text" : "password") : type;
  const resolvedPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    return `Enter your ${label.toLowerCase()}`;
  }, [label, placeholder]);

  return (
    <div className="auth-input-group">
      <label className="auth-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-shell">
        <Input
          id={id}
          className={cn("auth-input", passwordToggle && "pr-12", className)}
          placeholder={resolvedPlaceholder}
          type={resolvedType}
          {...restInputProps}
        />
        {passwordToggle ? (
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[0.8rem] text-rose-400">{error}</p> : null}
    </div>
  );
}
