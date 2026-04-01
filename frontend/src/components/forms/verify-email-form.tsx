"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse, SessionResponse } from "@/lib/types";

const schema = z.object({
  email: z.email("Valid email is required"),
  code: z.string().min(6, "Verification code is required"),
});

type FormValues = z.infer<typeof schema>;

export function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: params.get("email") ?? "",
      code: "",
    },
  });

  const verify = useMutation({
    mutationFn: (values: FormValues) => apiRequest<SessionResponse>("/api/auth/verify-email", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/");
    },
    onError: (error: ApiError) => {
      setNotice({ tone: "error", message: error.message });
    },
  });

  const resend = useMutation({
    mutationFn: (email: string) => apiRequest<AuthMessageResponse>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }),
    onSuccess: () => {
      setNotice({ tone: "success", message: "A fresh verification code has been sent." });
    },
    onError: (error: ApiError) => {
      setNotice({ tone: "error", message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => verify.mutate(values))}>
      <AuthInputField
        id="verify-email"
        label="Email"
        icon={Mail}
        error={form.formState.errors.email?.message}
        inputProps={{
          type: "email",
          autoComplete: "email",
          ...form.register("email"),
        }}
      />
      <AuthInputField
        id="verify-code"
        label="Verification code"
        icon={KeyRound}
        error={form.formState.errors.code?.message}
        inputProps={{
          inputMode: "numeric",
          autoComplete: "one-time-code",
          ...form.register("code"),
        }}
      />
      {notice && (
        <p className={notice.tone === "success" ? "auth-notice-success text-sm" : "auth-notice-error text-sm"}>
          {notice.message}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button className="auth-primary-button sm:flex-1" type="submit" disabled={verify.isPending}>
          {verify.isPending ? "Verifying..." : "Verify email"}
        </button>
        <button
          type="button"
          className="auth-muted-button sm:flex-1"
          disabled={resend.isPending}
          onClick={() => {
            const email = form.getValues("email");
            if (!email) {
              setNotice({ tone: "error", message: "Enter your email first." });
              return;
            }
            resend.mutate(email);
          }}
        >
          {resend.isPending ? "Sending..." : "Resend code"}
        </button>
      </div>
    </form>
  );
}
