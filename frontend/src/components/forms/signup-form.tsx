"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse } from "@/lib/types";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const signup = useMutation({
    mutationFn: (values: FormValues) => apiRequest<AuthMessageResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (response, values) => {
      const params = new URLSearchParams({ email: response.email || values.email });
      router.replace(`/verify-email?${params.toString()}`);
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => signup.mutate(values))}>
      <AuthInputField
        id="signup-name"
        label="Name"
        icon={UserRound}
        error={form.formState.errors.name?.message}
        inputProps={{
          autoComplete: "name",
          ...form.register("name"),
        }}
      />
      <AuthInputField
        id="signup-email"
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
        id="signup-password"
        label="Password"
        icon={LockKeyhole}
        passwordToggle
        error={form.formState.errors.password?.message}
        inputProps={{
          autoComplete: "new-password",
          ...form.register("password"),
        }}
      />
      {form.formState.errors.root && <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p>}
      <button className="auth-primary-button" type="submit" disabled={signup.isPending}>
        {signup.isPending ? "Creating account..." : "Create account"}
      </button>
      <p className="text-sm text-slate-500">Email verification is required before access starts.</p>
    </form>
  );
}
