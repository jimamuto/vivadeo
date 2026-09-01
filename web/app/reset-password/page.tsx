import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const { error, token = "" } = await searchParams;

  return (
    <div className="auth-minimal-page">
      <Link href="/" className="auth-minimal-logo"><BrandLogo /></Link>
      <main className="auth-minimal-main">
        <section className="auth-minimal-card fade-in">
          <h1>Choose a new password</h1>
          <p className="muted">Create a new password for your account.</p>

          {(error || !token) && (
            <p className="notice notice-bad" role="alert">
              {!token || error === "INVALID_TOKEN"
                ? "This reset link is invalid or has expired. Please request a new one."
                : error === "PASSWORD_MISMATCH"
                  ? "Passwords do not match."
                  : `Reset failed: ${error}`}
            </p>
          )}

          {token ? (
            <form className="form" method="post" action="/api/auth/reset-password">
              <input name="token" type="hidden" value={token} />
              <div className="field">
                <label htmlFor="password">New password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <button className="button" type="submit">Reset password</button>
            </form>
          ) : null}
          <div className="auth-minimal-links auth-minimal-links-centered">
            <Link href="/sign-in">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
