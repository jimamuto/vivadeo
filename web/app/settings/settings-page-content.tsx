import Link from "next/link";
import { cookies, headers } from "next/headers";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { auth } from "@/lib/auth";
import { AccountSettingsPanel } from "./account-settings-panel";
import { DeleteAccountPanel } from "./delete-account-panel";
import { LlmSettingsPanel } from "./llm-settings-panel";
import { PasswordSettingsPanel } from "./password-settings-panel";
import { NotificationSettingsPanel } from "./notification-settings-panel";
import { SETTINGS_SECTIONS, type SettingsSection } from "./settings-sections";

export async function SettingsPageContent({ section }: { section: SettingsSection }) {
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
        {SETTINGS_SECTIONS.map((item) => (
          <Link
            key={item.slug}
            className={section === item.slug ? "is-active" : ""}
            href={`/settings/${item.slug}`}
            aria-current={section === item.slug ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="settings-surface settings-content fade-in">
        {section === "account" ? (
          <AccountSettingsPanel email={email} displayName={displayName} emailVerified={emailVerified} profileImage={profileImage} />
        ) : null}
        {section === "security" ? <PasswordSettingsPanel /> : null}
        {section === "privacy" ? <DeleteAccountPanel /> : null}
        {section === "ai-providers" ? <LlmSettingsPanel /> : null}
        {section === "notifications" ? <NotificationSettingsPanel /> : null}
      </div>
    </DashboardShell>
  );
}
