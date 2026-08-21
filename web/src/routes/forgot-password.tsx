import { createFileRoute } from "@tanstack/react-router";
import { Link } from "~/components/link";

function ForgotPasswordPage() {
  return (
    <div className="shell page">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link to="/sign-in" className="button-secondary">Back to sign in</Link>
      </div>

      <section className="card fade-in">
        <h1>Password reset</h1>
        <p className="muted">Request a reset link for your workspace account.</p>
        <form className="form" method="post" action="/api/auth/forgot-password">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <button className="button" type="submit">Send reset link</button>
        </form>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage as any });
