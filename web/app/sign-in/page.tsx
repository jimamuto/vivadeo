import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SigninForm } from "./signin-form";
import { BrandLogo } from "@/components/brand-logo";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Your email address has not been verified. Enter the code from your inbox.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  USER_NOT_FOUND: "Invalid email or password.",
  INVALID_PASSWORD: "Invalid email or password.",
  UNKNOWN: "Something went wrong. Please try again.",
};

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verify?: string; reset?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div className="auth-minimal-page">
      <header className="auth-minimal-header">
        <Link href="/" className="auth-minimal-brand"><BrandLogo /></Link>
      </header>
      <main className="auth-minimal-main">
        <section className="auth-minimal-card fade-in">
          <div className="auth-minimal-logo"><BrandLogo /></div>
          <h1>Sign in</h1>
          <p className="muted">Use your workspace account to continue.</p>

          {params.verify === "done" && <p className="notice notice-good">Email verified. You can now sign in.</p>}
          {params.reset === "sent" && <p className="notice notice-good">Password reset email sent - check your inbox.</p>}
          {params.error && <p className="notice notice-bad">{errorMessage(params.error)}</p>}

          <SigninForm />
          <div className="auth-minimal-links">
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href="/sign-up">Create an account</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
