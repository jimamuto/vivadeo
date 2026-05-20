import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Your email address has not been verified. Please check your inbox for a verification link.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  USER_NOT_FOUND: "Invalid email or password.",
  INVALID_PASSWORD: "Invalid email or password.",
  UNKNOWN: "Something went wrong. Please try again.",
};

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`;
}

function AuthArt() {
  return (
    <div className="auth-art">
      <div className="auth-art-sheen" />
      <div className="auth-art-card">
        <span>Workspace access</span>
        <strong>Welcome back</strong>
        <p>Sign in to manage uploads, search, and clips in a clean workspace boundary.</p>
      </div>
    </div>
  );
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
    <div className="shell page">
      <div className="topbar">
        <div className="topbar-shell">
          <div className="brand">
            <span className="brand-mark" />
            Vivadeo
          </div>
          <div className="nav-center">
            <Link href="/" className="nav-link">Home</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
          </div>
          <div className="nav-spacer" />
          <div className="nav-actions">
            <Link href="/sign-up" className="button">Sign Up</Link>
          </div>
        </div>
      </div>

      <section className="auth-shell fade-in">
        <AuthArt />
        <div className="card auth-panel">
          <h1>Sign in</h1>
          <p className="muted">Use your workspace account to manage uploads, search, and clips.</p>

          {params.verify === "sent" && <p className="notice notice-good">Account created. Check email for a verification link.</p>}
          {params.reset === "sent" && <p className="notice notice-good">Password reset email sent - check your inbox.</p>}
          {params.error && <p className="notice notice-bad">{errorMessage(params.error)}</p>}

          <form className="form" method="post" action="/api/auth/sign-in">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="button" type="submit">Sign in</button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}><Link href="/forgot-password">Forgot password?</Link></p>
        </div>
      </section>
    </div>
  );
}
