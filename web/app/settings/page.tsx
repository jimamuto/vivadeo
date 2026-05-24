import Link from "next/link";
import { headers } from "next/headers";
import { AppTopbar } from "@/components/app-topbar";
import { auth } from "@/lib/auth";
import { AccountSettingsPanel } from "./account-settings-panel";
import { DeleteAccountPanel } from "./delete-account-panel";
import { SessionPanel } from "./session-panel";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const displayName = user?.name || "Your display name";
  const email = user?.email || "your@email.example";
  const emailVerified = Boolean(user && "emailVerified" in user ? user.emailVerified : false);
  const initial = (displayName || "V").trim().slice(0, 1).toUpperCase();

  return (
    <div className="shell page">
      <AppTopbar profileInitial={initial} />

      <div className="split settings-surface fade-in">
        <AccountSettingsPanel
          email={email}
          displayName={displayName}
          emailVerified={emailVerified}
        />

        <article className="surface-section">
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

      <div className="settings-surface fade-in" style={{ marginTop: 18 }}>
        <SessionPanel />
      </div>

      <div className="settings-surface fade-in" style={{ marginTop: 18 }}>
        <DeleteAccountPanel />
      </div>
    </div>
  );
}
