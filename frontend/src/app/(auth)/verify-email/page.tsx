import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { VerifyEmailForm } from "@/components/forms/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Verify Access"
        title="Confirm your email"
        subtitle="Enter the code from your inbox to activate access."
        alternateHref="/login"
        alternateLabel="Back to login"
      >
        <VerifyEmailForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
