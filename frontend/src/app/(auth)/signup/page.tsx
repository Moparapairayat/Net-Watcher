import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Secure Access"
        title="Create account"
        subtitle="Complete the guided setup to secure your workspace access."
        alternateHref="/login"
        alternateLabel="Back to login"
        backdropClassName="py-3 sm:py-4"
        shellClassName="sm:max-w-[38rem] px-4 py-4 sm:px-5 sm:py-5"
        contentClassName="mt-4 sm:mt-5"
      >
        <SignupForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
