"use client";

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
            Forgot password?
          </Link>
        </div>
      </div>
      {form.formState.errors.root && <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p>}
      <button className="auth-primary-button" type="submit" disabled={login.isPending}>
        {login.isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
