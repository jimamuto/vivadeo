import Link from "next/link";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { auth } from "@/lib/auth";
import { AccountSettingsPanel } from "./account-settings-panel";
import { DeleteAccountPanel } from "./delete-account-panel";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const displayName = user?.name || "Your display name";
  const email = user?.email || "your@email.example";
  const emailVerified = Boolean(user && "emailVerified" in user ? user.emailVerified : false);
  const initial = (displayName || "V").trim().slice(0, 1).toUpperCase();
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={workspace} profileInitial={initial} profileName={displayName}>

      <header className="settings-header fade-in">
        <div>
          <p className="eyebrow">Personal workspace</p>
          <h1>Settings</h1>
          <p className="muted">Manage your account settings and preferences.</p>
        </div>
        <div className="settings-header-actions">
          <Link href="/chat" className="button-secondary">Back to dashboard</Link>
          <form action="/api/auth/sign-out" method="post">
            <button className="button-secondary" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        <a className="is-active" href="#account">Account</a>
        <a href="#security">Security</a>
        <a href="#privacy">Data &amp; privacy</a>
      </nav>

      <div className="settings-surface settings-content fade-in">
        <AccountSettingsPanel
          email={email}
          displayName={displayName}
          emailVerified={emailVerified}
        />
        <DeleteAccountPanel />
      </div>
    </DashboardShell>
  );
}
