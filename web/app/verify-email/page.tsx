import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { BrandLogo } from "@/components/brand-logo";
import { VerificationCodeInput } from "@/components/verification-code-input";
import { VerificationResendForm } from "@/components/verification-resend-form";
import { VerificationSentNotice } from "@/components/verification-sent-notice";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Verify email", description: "Verify the email address for your Vivadeo account." };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; sent?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const params = await searchParams;
  const email = params.email || "";

  return (
    <div className="auth-minimal-page">
      <Link href="/" className="auth-minimal-logo"><BrandLogo /></Link>
      <main className="auth-minimal-main">
        <section className="auth-minimal-card fade-in">
          <h1>Verify your email</h1>
          <p className="muted">Enter the six-digit code sent to {email || "your email address"}.</p>

          {params.sent === "1" ? <VerificationSentNotice /> : null}
          {params.error === "invalid" ? <p className="notice notice-bad" role="alert">That code is invalid or expired.</p> : null}

          <form className="form" method="post" action="/api/auth/verify-email">
            <input type="hidden" name="email" value={email} />
            <div className="field">
              <VerificationCodeInput />
            </div>
            <SubmitButton pendingLabel="Verifying...">Verify email</SubmitButton>
          </form>

          <VerificationResendForm email={email} cooldown={params.sent === "1"} />
          <div className="auth-minimal-links auth-minimal-links-centered">
            <Link href="/sign-in">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
