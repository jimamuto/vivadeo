import { createFileRoute, useLocation } from "@tanstack/react-router";
import { getRequestSession } from "~/lib/server-functions";
import { Link } from "~/components/link";

function VerifyEmailPage() {
  const session = Route.useLoaderData();
  const query = new URLSearchParams(useLocation().searchStr);
  const params = { email: query.get("email") || undefined, error: query.get("error") || undefined, sent: query.get("sent") || undefined };
  const email = params.email || "";

  return (
    <div className="shell page">
      <div className="topbar">
        <div className="topbar-shell">
          <div className="brand">Vivadeo</div>
          <Link to="/sign-in" className="button-secondary">Back to sign in</Link>
        </div>
      </div>

      <section className="card verify-email-card fade-in">
        <p className="eyebrow">Email verification</p>
        <h1>Enter your code</h1>
        <p className="muted">We sent a six-digit code to {email || "your email address"}. Enter it below to activate your workspace.</p>
        {params.sent === "1" ? <p className="notice notice-good">A new verification code has been sent.</p> : null}
        {params.error === "invalid" ? <p className="notice notice-bad">That code is invalid or expired. Try again or request a new one.</p> : null}

        <form className="form" method="post" action="/api/auth/verify-email">
          <input type="hidden" name="email" value={email} />
          <div className="field">
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              aria-label="Six-digit verification code"
              required
            />
          </div>
          <button className="button" type="submit">Verify email</button>
        </form>

        <form className="verify-resend-form" method="post" action="/api/auth/verify-email">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="intent" value="resend" />
          <button className="button-secondary" type="submit">Send a new code</button>
        </form>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/verify-email")({ loader: () => getRequestSession(), component: VerifyEmailPage as any });
