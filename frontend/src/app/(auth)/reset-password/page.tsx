import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Recovery"
        title="Set new password"
        subtitle="Set a new password for your account."
        alternateHref="/login"
        alternateLabel="Back to login"
      >
        <ResetPasswordForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
