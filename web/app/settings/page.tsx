import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="shell" style={{ padding: "28px 0 52px" }}>
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Vivadeo
        </div>
        <Link href="/dashboard" className="button-secondary">Back to dashboard</Link>
      </div>

      <div className="split fade-in">
        <article className="card">
          <h1>Account settings</h1>
          <p className="muted">Profile, password, notifications, and session controls live here.</p>
          <form className="form">
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" defaultValue="Avery Taylor" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" defaultValue="avery@northwind.example" />
            </div>
            <button className="button" type="button">Save changes</button>
          </form>
        </article>

        <article className="card">
          <h3>Admin controls</h3>
          <p className="muted">Workspace roles, invites, and billing settings are scoped to the active organization.</p>
          <ul>
            <li>Invite teammates</li>
            <li>Review workspace role assignments</li>
            <li>Update plan and support settings</li>
          </ul>
          <form action="/api/auth/sign-out" method="post">
            <button className="button-secondary" type="submit">Sign out</button>
          </form>
        </article>
      </div>
    </div>
  );
}
