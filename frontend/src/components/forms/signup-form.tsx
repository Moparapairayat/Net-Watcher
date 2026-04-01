"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft, ChevronRight, KeyRound, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthMessageResponse, SessionResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    code: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;
type SignupStep = 1 | 2 | 3 | 4;

const stepMeta: Array<{ step: SignupStep; label: string }> = [
  { step: 1, label: "Identity" },
  { step: 2, label: "Password" },
  { step: 3, label: "Verify" },
  { step: 4, label: "Success" },
];

export function SignupForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const redirectTimer = useRef<number | null>(null);
  const [step, setStep] = useState<SignupStep>(1);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string>("");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      code: "",
    },
  });

  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? "";
  const confirmPasswordValue = useWatch({ control: form.control, name: "confirmPassword" }) ?? "";
  const signupEmail = useWatch({ control: form.control, name: "email" }) ?? "";
  const passwordsMatch = confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;
  const passwordsMismatch = confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue;

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const signup = useMutation({
    mutationFn: ({ firstName, lastName, email, password, confirmPassword }: FormValues) =>
      apiRequest<AuthMessageResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email,
          password,
          confirm_password: confirmPassword,
        }),
      }),
    onSuccess: (response, values) => {
      setNotice({ tone: "success", message: response.message || "Account created. Enter the email code to continue." });
      setPreviewCode(response.preview_code ?? null);
      setSuccessEmail(response.email || values.email);
      form.setValue("code", "");
      form.clearErrors("code");
      setStep(3);
    },
    onError: (error: ApiError) => {
      form.setError("root", { message: error.message });
    },
  });

  const verify = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      apiRequest<SessionResponse & { message?: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData(["session"], {
        authenticated: true,
        user: response.user ?? null,
        mode: "authenticated",
        read_only: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setNotice(null);
      setStep(4);
      redirectTimer.current = window.setTimeout(() => {
        router.replace("/");
      }, 2800);
    },
    onError: (error: ApiError) => {
      setNotice({ tone: "error", message: error.message });
    },
  });

  const resend = useMutation({
    mutationFn: (email: string) =>
      apiRequest<AuthMessageResponse>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: (response) => {
      setNotice({ tone: "success", message: "A fresh verification code has been sent." });
      setPreviewCode(response.preview_code ?? null);
    },
    onError: (error: ApiError) => {
      setNotice({ tone: "error", message: error.message });
    },
  });

  async function moveToPasswordStep() {
    setNotice(null);
    const valid = await form.trigger(["firstName", "lastName", "email"]);
    if (!valid) return;
    setStep(2);
  }

  const submitSignup = form.handleSubmit((values) => {
    setNotice(null);
    signup.mutate(values);
  });

  async function submitVerification() {
    setNotice(null);
    form.clearErrors("code");
    const valid = await form.trigger(["email"]);
    if (!valid) return;

    const code = form.getValues("code")?.trim() ?? "";
    if (code.length < 6) {
      form.setError("code", { message: "Verification code is required" });
      return;
    }

    verify.mutate({
      email: form.getValues("email"),
      code,
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <span>Step {step} of 4</span>
          <span>{stepMeta.find((item) => item.step === step)?.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stepMeta.map((item) => {
            const isActive = item.step === step;
            const isComplete = item.step < step;
            return (
              <div
                key={item.step}
                className={cn(
                  "auth-step-card",
                  isActive && "auth-step-card-active",
                  isComplete && "auth-step-card-complete",
                )}
              >
                <span className="auth-step-index">{item.step}</span>
                <span className={cn("auth-step-label", (isActive || isComplete) && "text-slate-200")}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {step === 1 ? (
        <div className="grid gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <AuthInputField
              id="signup-first-name"
              label="First name"
              icon={UserRound}
              error={form.formState.errors.firstName?.message}
              inputProps={{
                autoComplete: "given-name",
                ...form.register("firstName"),
              }}
            />
            <AuthInputField
              id="signup-last-name"
              label="Last name"
              icon={UserRound}
              error={form.formState.errors.lastName?.message}
              inputProps={{
                autoComplete: "family-name",
                ...form.register("lastName"),
              }}
            />
          </div>
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
          <button className="auth-primary-button" type="button" onClick={moveToPasswordStep}>
            Continue <ChevronRight className="ml-2 inline-flex h-4 w-4" />
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <form className="grid gap-3.5" onSubmit={submitSignup}>
          <div className="auth-password-stage">
            <div className="auth-password-stage-main">
              <div className="grid gap-1.5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Password setup</p>
                <p className="text-sm leading-6 text-slate-400">Set the password you will use to sign in to the workspace.</p>
              </div>

              <div className="grid gap-3">
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
                <div className="grid gap-2">
                  <AuthInputField
                    id="signup-confirm-password"
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

                <PasswordStrengthMeter password={passwordValue} compact />
              </div>
            </div>
          </div>

          {form.formState.errors.root ? <p className="auth-notice-error text-sm">{form.formState.errors.root.message}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="auth-muted-button sm:flex-1" type="button" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 inline-flex h-4 w-4" /> Back
            </button>
            <button className="auth-primary-button sm:flex-1" type="submit" disabled={signup.isPending}>
              {signup.isPending ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-3.5">
          <div className="auth-step-panel">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Verification target</p>
            <p className="mt-2 text-base font-medium text-slate-100">{signupEmail}</p>
            <p className="mt-1 text-sm text-slate-500">Enter the 6-digit email code to activate the account.</p>
            {previewCode ? <p className="mt-3 text-sm text-sky-300">Preview code: {previewCode}</p> : null}
          </div>

          <div className="grid gap-2">
            <label className="auth-field-label" htmlFor="verify-code">
              Email OTP
            </label>
            <div className="auth-otp-shell">
              <KeyRound className="h-5 w-5 text-sky-400/80" />
              <input
                id="verify-code"
                className="auth-otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                {...form.register("code", {
                  onChange: () => form.clearErrors("code"),
                })}
              />
            </div>
            {form.formState.errors.code?.message ? <p className="text-[0.8rem] text-rose-400">{form.formState.errors.code.message}</p> : null}
          </div>

          {notice ? (
            <p className={notice.tone === "success" ? "auth-notice-success text-sm" : "auth-notice-error text-sm"}>{notice.message}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="auth-muted-button sm:flex-1" type="button" onClick={() => setStep(2)} disabled={verify.isPending || resend.isPending}>
              <ChevronLeft className="mr-2 inline-flex h-4 w-4" /> Back
            </button>
            <button className="auth-primary-button sm:flex-1" type="button" onClick={submitVerification} disabled={verify.isPending}>
              {verify.isPending ? "Verifying..." : "Verify email"}
            </button>
          </div>

          <button className="auth-muted-button" type="button" disabled={resend.isPending} onClick={() => resend.mutate(signupEmail)}>
            {resend.isPending ? "Sending..." : "Resend code"}
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="auth-success-shell grid gap-3.5 text-center">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-300" />
          </div>
          <div className="grid gap-2">
            <h3 className="font-space text-2xl font-bold tracking-[-0.04em] text-white">Account ready</h3>
            <p className="text-sm leading-6 text-slate-400">{successEmail || signupEmail} is verified. Opening the workspace now.</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/12 bg-emerald-500/6 px-4 py-3 text-left">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">Access granted</p>
            <p className="mt-2 text-sm text-slate-300">Your email is confirmed and the workspace session is ready.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="auth-primary-button sm:flex-1" type="button" onClick={() => router.replace("/")}>
              Open dashboard
            </button>
            <button className="auth-muted-button sm:flex-1" type="button" onClick={() => router.replace("/login")}>
              Back to login
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
