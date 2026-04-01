import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Recovery"
        title="Forgot password"
        subtitle="Request a password reset link for your workspace account."
        alternateHref="/login"
        alternateLabel="Back to login"
      >
        <ForgotPasswordForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
