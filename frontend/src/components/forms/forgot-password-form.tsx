"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse } from "@/lib/types";

const schema = z.object({
  email: z.email("Valid email is required"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const forgot = useMutation({
    mutationFn: (values: FormValues) => apiRequest<AuthMessageResponse>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (response) => {
      setNotice({ tone: "success", message: response.message || "If the account exists, a reset link has been issued." });
    },
    onError: (error: ApiError) => {
      setNotice({ tone: "error", message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => forgot.mutate(values))}>
      <AuthInputField
        id="forgot-email"
        label="Email"
        icon={Mail}
        error={form.formState.errors.email?.message}
        inputProps={{
          type: "email",
          autoComplete: "email",
          ...form.register("email"),
        }}
      />
      {notice && (
        <p className={notice.tone === "success" ? "auth-notice-success text-sm" : "auth-notice-error text-sm"}>
          {notice.message}
        </p>
      )}
      <button className="auth-primary-button" type="submit" disabled={forgot.isPending}>
        {forgot.isPending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
