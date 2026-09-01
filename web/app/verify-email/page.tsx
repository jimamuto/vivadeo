import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { BrandLogo } from "@/components/brand-logo";

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

          {params.sent === "1" ? <p className="notice notice-good">Verification code sent.</p> : null}
          {params.error === "invalid" ? <p className="notice notice-bad" role="alert">That code is invalid or expired.</p> : null}

          <form className="form" method="post" action="/api/auth/verify-email">
            <input type="hidden" name="email" value={email} />
            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" aria-label="Six-digit verification code" required />
            </div>
            <SubmitButton pendingLabel="Verifying...">Verify email</SubmitButton>
          </form>

          <form className="verify-resend-form" method="post" action="/api/auth/verify-email">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="intent" value="resend" />
            <SubmitButton className="button-secondary" pendingLabel="Sending...">Send a new code</SubmitButton>
          </form>
          <div className="auth-minimal-links auth-minimal-links-centered">
            <Link href="/sign-in">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
