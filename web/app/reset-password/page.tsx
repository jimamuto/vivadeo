import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/sign-in" className="button-secondary">
          Back to sign in
        </Link>
      </div>

      <section className="card fade-in">
        <h1>Choose a new password</h1>
        <p className="muted">
          Enter the reset token from your email to complete the password reset.
        </p>

        {error && (
          <p style={{ color: "var(--color-error, #f87171)", marginBottom: 16 }}>
            {error === "INVALID_TOKEN"
              ? "This reset link is invalid or has expired. Please request a new one."
              : `Reset failed: ${error}`}
          </p>
        )}

        <form className="form" method="post" action="/api/auth/reset-password">
          <div className="field">
            <label htmlFor="token">Reset token</label>
            <input id="token" name="token" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="button" type="submit">
            Reset password
          </button>
        </form>
      </section>
    </div>
  );
}
