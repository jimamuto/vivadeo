import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/" className="button-secondary">Back to landing</Link>
      </div>

      <div className="split fade-in">
        <section className="card">
          <h1>Sign in</h1>
          <p className="muted">Use your workspace account to manage uploads, search, and clips.</p>
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
          <p className="muted" style={{ marginTop: 16 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </section>

        <aside className="card">
          <h3>Workspace access</h3>
          <p className="muted">Better Auth sessions live in Postgres alongside product data. Workspace membership drives every request.</p>
          <ul>
            <li>Email verification</li>
            <li>Password reset</li>
            <li>Invites and roles</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
