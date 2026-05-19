import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="shell" style={{ padding: "28px 0 48px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/sign-in" className="button-secondary">Sign in</Link>
      </div>

      <section className="card fade-in">
        <h1>Join workspace invite</h1>
        <p className="muted">Accept the invitation token below to join the workspace.</p>
        <p className="pill">Token: {token}</p>
        <form className="form" method="post" action="/api/auth/accept-invite">
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="password">Set password</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="button" type="submit">Accept invite</button>
        </form>
      </section>
    </div>
  );
}
