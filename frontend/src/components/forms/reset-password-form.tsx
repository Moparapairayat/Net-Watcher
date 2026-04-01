"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse } from "@/lib/types";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? "";
  const confirmPasswordValue = useWatch({ control: form.control, name: "confirmPassword" }) ?? "";
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;
  const passwordsMismatch = confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue;

  const reset = useMutation({
    mutationFn: ({ password, confirmPassword }: FormValues) =>
      apiRequest<AuthMessageResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
      }),
    onSuccess: () => {
      router.replace("/login");
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => reset.mutate(values))}>
      <div className="grid gap-3">
        <AuthInputField
          id="reset-password"
          label="New password"
          icon={LockKeyhole}
          passwordToggle
          error={form.formState.errors.password?.message}
          inputProps={{
            autoComplete: "new-password",
            ...form.register("password"),
          }}
        />
        <PasswordStrengthMeter password={passwordValue} />
      </div>
      <div className="grid gap-2">
        <AuthInputField
          id="reset-confirm-password"
          label="Confirm password"
          icon={LockKeyhole}
          passwordToggle
          error={form.formState.errors.confirmPassword?.message}
          inputProps={{
            autoComplete: "new-password",
            ...form.register("confirmPassword"),
          }}
        />
        {passwordsMatch ? <p className="text-sm text-emerald-300">Passwords match</p> : null}
        {passwordsMismatch && !form.formState.errors.confirmPassword ? <p className="text-sm text-rose-300">Passwords do not match</p> : null}
      </div>
      {form.formState.errors.root && <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p>}
      <button className="auth-primary-button" type="submit" disabled={reset.isPending || !token}>
        {reset.isPending ? "Updating..." : "Set password"}
      </button>
      {!token && <p className="text-sm text-rose-500">Reset token is missing from the URL.</p>}
    </form>
  );
}
