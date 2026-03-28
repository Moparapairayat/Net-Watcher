import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { SignupForm } from "@/components/forms/signup-form";

export default function SignupPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Create Operator"
        title="Create your account"
        subtitle="Set up secure access for your NetWatcher workspace."
        alternateHref="/login"
        alternateLabel="Sign in"
      >
        <SignupForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
