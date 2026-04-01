"use client";

import type { ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiError } from "@/lib/api";
import { SessionResponse } from "@/lib/types";

const schema = z.object({
  email: z.email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.05rem] w-[1.05rem]" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.68.5 12.08c0 5.12 3.3 9.46 7.88 11 .58.11.79-.26.79-.57 0-.28-.01-1.21-.02-2.2-3.2.7-3.88-1.37-3.88-1.37-.52-1.35-1.28-1.7-1.28-1.7-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.19 1.75 1.19 1.02 1.77 2.68 1.26 3.33.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.29-5.23-5.73 0-1.26.45-2.3 1.18-3.11-.12-.3-.51-1.49.11-3.11 0 0 .96-.31 3.15 1.19a10.82 10.82 0 0 1 5.74 0c2.19-1.5 3.15-1.19 3.15-1.19.62 1.62.23 2.81.11 3.11.73.81 1.18 1.85 1.18 3.11 0 4.45-2.69 5.43-5.25 5.72.41.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.21 0 .31.21.69.8.57 4.57-1.54 7.87-5.88 7.87-11C23.5 5.68 18.35.5 12 .5Z" />
    </svg>
  );
}

function ProviderButton({ label, icon, disabled = true }: { label: string; icon: ReactNode; disabled?: boolean }) {
  return (
    <button className="auth-provider-button" type="button" disabled={disabled}>
      <span className="auth-provider-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const login = useMutation({
    mutationFn: (values: FormValues) => apiRequest<SessionResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/");
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  const demoLogin = useMutation({
    mutationFn: () => apiRequest<SessionResponse>("/api/auth/demo-login", { method: "POST", body: JSON.stringify({}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/");
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
      <AuthInputField
        id="login-email"
        label="Email"
        icon={Mail}
        error={form.formState.errors.email?.message}
        inputProps={{
          type: "email",
          autoComplete: "email",
          ...form.register("email"),
        }}
      />
      <div>
        <AuthInputField
          id="login-password"
          label="Password"
          icon={LockKeyhole}
          passwordToggle
          error={form.formState.errors.password?.message}
          inputProps={{
            autoComplete: "current-password",
            ...form.register("password"),
          }}
        />
        <div className="mt-2 flex justify-end">
          <Link className="auth-inline-link" href="/forgot-password">
            Forgot password
          </Link>
        </div>
      </div>
      {form.formState.errors.root && <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p>}
      <button className="auth-primary-button" type="submit" disabled={login.isPending}>
        {login.isPending ? "Logging in..." : "Login"}
      </button>
      <button className="auth-muted-button" type="button" disabled={demoLogin.isPending} onClick={() => demoLogin.mutate()}>
        {demoLogin.isPending ? "Opening demo..." : "Continue as Demo"}
      </button>
      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="auth-footer-link">
          Create an account
        </Link>
      </p>
      <div className="auth-divider">Alternative access</div>
      <div className="grid gap-2.5">
        <ProviderButton label="Continue with GitHub" icon={<GithubMark />} />
      </div>
    </form>
  );
}
