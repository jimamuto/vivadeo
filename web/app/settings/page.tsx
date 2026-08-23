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
  const profileImage = user && "image" in user && user.image ? "/api/profile/avatar" : null;
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={workspace} profileInitial={initial} profileName={displayName} profileImage={profileImage}>

      <header className="settings-header fade-in">
        <div>
          <h1>Settings</h1>
          <p className="muted">Manage your account settings and preferences.</p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        <a className="is-active" href="#account">Account</a>
        <a href="#security">Security</a>
        <a href="#privacy">Data &amp; privacy</a>
        <span className="is-disabled" aria-disabled="true">Notifications</span>
        <span className="is-disabled" aria-disabled="true">Billing</span>
      </nav>

      <div className="settings-surface settings-content fade-in">
        <AccountSettingsPanel
          email={email}
          displayName={displayName}
          emailVerified={emailVerified}
          profileImage={profileImage}
        />
        <DeleteAccountPanel />
      </div>
    </DashboardShell>
  );
}
