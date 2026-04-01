import { AuthLayoutCard } from "@/components/auth/auth-layout-card";
import { GuestOnly } from "@/components/auth/guest-only";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <GuestOnly>
      <AuthLayoutCard
        eyebrow="Secure Access"
        title="Login"
        subtitle="Access your monitoring workspace."
        alternateHref="/signup"
        alternateLabel="Create an account"
        showAlternateFooter={false}
      >
        <LoginForm />
      </AuthLayoutCard>
    </GuestOnly>
  );
}
