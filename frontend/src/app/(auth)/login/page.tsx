import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Operator Login"
        title="Welcome back"
        subtitle="Sign in to continue in your NetWatcher workspace."
        alternateHref="/signup"
        alternateLabel="Create an account"
      >
        <LoginForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
