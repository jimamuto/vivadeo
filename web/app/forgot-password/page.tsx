import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-minimal-page">
      <Link href="/" className="auth-minimal-logo"><BrandLogo /></Link>
      <main className="auth-minimal-main">
        <section className="auth-minimal-card fade-in">
          <h1>Reset your password</h1>
          <p className="muted">Enter your email and we’ll send you a reset link.</p>
          <form className="form" method="post" action="/api/auth/forgot-password">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <button className="button" type="submit">Send reset link</button>
          </form>
          <div className="auth-minimal-links auth-minimal-links-centered">
            <Link href="/sign-in">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
