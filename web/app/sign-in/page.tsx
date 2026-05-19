import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED:
    "Your email address has not been verified. Please check your inbox for a verification link.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  USER_NOT_FOUND: "Invalid email or password.",
  INVALID_PASSWORD: "Invalid email or password.",
  UNKNOWN: "Something went wrong. Please try again.",
};

function errorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? `Sign-in failed (${code}). Please try again.`;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verify?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/" className="button-secondary">
          Back to landing
        </Link>
      </div>

      <div className="split fade-in">
        <section className="card">
          <h1>Sign in</h1>
          <p className="muted">
            Use your workspace account to manage uploads, search, and clips.
          </p>

          {params.verify === "sent" && (
            <p
              style={{
                color: "var(--color-success, #4ade80)",
                marginBottom: 16,
              }}
            >
              Account created! Check your email for a verification link before
              signing in.
            </p>
          )}
          {params.reset === "sent" && (
            <p
              style={{
                color: "var(--color-success, #4ade80)",
                marginBottom: 16,
              }}
            >
              Password reset email sent — check your inbox.
            </p>
          )}
          {params.error && (
            <p
              style={{ color: "var(--color-error, #f87171)", marginBottom: 16 }}
            >
              {errorMessage(params.error)}
            </p>
          )}

          <form className="form" method="post" action="/api/auth/sign-in">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="button" type="submit">
              Sign in
            </button>
          </form>
          <p className="muted" style={{ marginTop: 16 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        </section>

        <aside className="card">
          <h3>Workspace access</h3>
          <p className="muted">
            Better Auth sessions live in Postgres alongside product data.
            Workspace membership drives every request.
          </p>
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
