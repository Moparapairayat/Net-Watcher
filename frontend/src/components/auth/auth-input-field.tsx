"use client";

import { InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthInputFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  passwordToggle?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

export function AuthInputField({ id, label, icon: Icon, error, passwordToggle = false, inputProps }: AuthInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = passwordToggle ? (showPassword ? "text" : "password") : inputProps?.type;

  return (
    <div>
      <div className="auth-input-shell">
        <Icon className="auth-input-icon" />
        <Input
          id={id}
          placeholder=" "
          className={cn("auth-input peer", passwordToggle && "pr-12")}
          {...inputProps}
          type={resolvedType}
        />
        <label className="auth-floating-label" htmlFor={id}>
          {label}
        </label>
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
      {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
    </div>
  );
}
