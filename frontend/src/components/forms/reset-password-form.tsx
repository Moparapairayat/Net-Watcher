"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse } from "@/lib/types";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  const reset = useMutation({
    mutationFn: (values: FormValues) => apiRequest<AuthMessageResponse>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: values.password }) }),
    onSuccess: () => {
      router.replace("/login");
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => reset.mutate(values))}>
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
      {form.formState.errors.root && <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p>}
      <button className="auth-primary-button" type="submit" disabled={reset.isPending || !token}>
        {reset.isPending ? "Updating..." : "Set password"}
      </button>
      {!token && <p className="text-sm text-rose-500">Reset token is missing from the URL.</p>}
    </form>
  );
}
