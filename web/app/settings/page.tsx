import Link from "next/link";
import { headers } from "next/headers";
import { AppTopbar } from "@/components/app-topbar";
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

  return (
    <div className="shell page">
      <AppTopbar profileInitial={initial} />

      <header className="settings-header fade-in">
        <div>
          <p className="eyebrow">Personal workspace</p>
          <h1>Settings</h1>
          <p className="muted">Manage your profile, password, and account preferences.</p>
        </div>
        <div className="settings-header-actions">
          <Link href="/chat" className="button-secondary">Back to dashboard</Link>
          <form action="/api/auth/sign-out" method="post">
            <button className="button-secondary" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <div className="settings-surface settings-content fade-in">
        <AccountSettingsPanel
          email={email}
          displayName={displayName}
          emailVerified={emailVerified}
        />
        <DeleteAccountPanel />
      </div>
    </div>
  );
}
