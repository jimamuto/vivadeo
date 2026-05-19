import Link from "next/link";
import { headers } from "next/headers";
import { AppTopbar } from "@/components/app-topbar";
import { auth } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const displayName = user?.name || "Your display name";
  const email = user?.email || "your@email.example";
  const initial = (displayName || "V").trim().slice(0, 1).toUpperCase();

  return (
    <div className="shell page">
      <AppTopbar profileInitial={initial} />

      <div className="split fade-in">
        <article className="card">
          <h1>Account settings</h1>
          <p className="muted">Profile, password, notifications, and session controls live here.</p>
          <form className="form">
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" defaultValue={displayName} readOnly />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" defaultValue={email} readOnly />
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
