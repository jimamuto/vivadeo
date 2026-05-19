import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/sign-in" className="button-secondary">Back to sign in</Link>
      </div>

      <section className="card fade-in">
        <h1>Choose a new password</h1>
        <p className="muted">Enter the reset token from your email to complete the password reset.</p>
        <form className="form" method="post" action="/api/auth/reset-password">
          <div className="field">
            <label htmlFor="token">Reset token</label>
            <input id="token" name="token" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="button" type="submit">Reset password</button>
        </form>
      </section>
    </div>
  );
}
