"use client";

import { useEffect, useRef, useState } from "react";

type AccountSettingsPanelProps = {
  email: string;
  displayName: string;
  emailVerified: boolean;
  profileImage?: string | null;
};

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function AccountSettingsPanel({
  email,
  displayName,
  emailVerified,
  profileImage,
}: AccountSettingsPanelProps) {
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [surname, setSurname] = useState(nameParts.slice(1).join(" "));
  const [savedProfileName, setSavedProfileName] = useState(displayName.trim());
  const [city, setCity] = useState("Nairobi");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy HH:mm");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<FetchStatus>({ state: "idle" });
  const [passwordStatus, setPasswordStatus] = useState<FetchStatus>({ state: "idle" });
  const [verifyStatus, setVerifyStatus] = useState<FetchStatus>({ state: "idle" });
  const [avatarUrl, setAvatarUrl] = useState(profileImage || "");
  const [avatarStatus, setAvatarStatus] = useState<FetchStatus>({ state: "idle" });
  const [preferencesStatus, setPreferencesStatus] = useState<FetchStatus>({ state: "idle" });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/profile/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const preferences = await response.json() as { city?: string; timezone?: string; date_format?: string };
        if (preferences.city !== undefined) setCity(preferences.city);
        if (preferences.timezone) setTimezone(preferences.timezone);
        if (preferences.date_format) setDateFormat(preferences.date_format);
      })
      .catch(() => undefined);
  }, []);

  const profileName = [firstName.trim(), surname.trim()].filter(Boolean).join(" ");
  const profileChanged = profileName !== savedProfileName;

  async function saveProfile() {
    setProfileStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      if (!response.ok) throw new Error(`Profile update failed (${response.status})`);
      setSavedProfileName(profileName);
      setProfileStatus({ state: "ok", message: "Profile updated." });
    } catch (cause) {
      setProfileStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Profile update failed",
      });
    }
  }

  async function resendVerification() {
    setVerifyStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          callbackURL: `${window.location.origin}/settings?verify=done`,
        }),
      });
      if (!response.ok) throw new Error(`Verification email failed (${response.status})`);
      setVerifyStatus({ state: "ok", message: "Verification email sent." });
    } catch (cause) {
      setVerifyStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Verification email failed",
      });
    }
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      setAvatarStatus({ state: "error", message: "Choose an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus({ state: "error", message: "Images must be 5 MB or smaller." });
      return;
    }
    setAvatarStatus({ state: "loading" });
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const payload = (await response.json()) as { image?: string; detail?: string };
      if (!response.ok || !payload.image) throw new Error(payload.detail || `Avatar upload failed (${response.status})`);
      setAvatarUrl(payload.image);
      setAvatarStatus({ state: "ok", message: "Photo updated." });
    } catch (cause) {
      setAvatarStatus({ state: "error", message: cause instanceof Error ? cause.message : "Avatar upload failed" });
    }
  }

  async function removeAvatar() {
    setAvatarStatus({ state: "loading" });
    const response = await fetch("/api/profile/avatar", { method: "DELETE" });
    if (!response.ok) {
      setAvatarStatus({ state: "error", message: "Could not remove photo." });
      return;
    }
    setAvatarUrl("");
    setAvatarStatus({ state: "ok", message: "Photo removed." });
  }

  async function savePreferences(next: { city?: string; timezone?: string; date_format?: string }) {
    setPreferencesStatus({ state: "loading" });
    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, timezone, date_format: dateFormat, ...next }),
      });
      if (!response.ok) throw new Error("Could not save preferences");
      setPreferencesStatus({ state: "ok", message: "Preferences saved." });
    } catch (cause) {
      setPreferencesStatus({ state: "error", message: cause instanceof Error ? cause.message : "Could not save preferences" });
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordStatus({ state: "error", message: "Enter current and new password." });
      return;
    }
    setPasswordStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        }),
      });
      if (!response.ok) throw new Error(`Password change failed (${response.status})`);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus({ state: "ok", message: "Password changed." });
    } catch (cause) {
      setPasswordStatus({
        state: "error",
        message: cause instanceof Error ? cause.message : "Password change failed",
      });
    }
  }

  function renderStatus(status: FetchStatus) {
    if (status.state === "idle") return null;
    return <p className="muted">{status.state === "loading" ? "Working..." : status.message}</p>;
  }

  return (
    <section id="account" className="settings-section">
      <div className="profile-settings-grid">
        <div className="profile-section-copy">
          <h2>Profile</h2>
          <p className="muted">Set your account details.</p>
        </div>
        <div className="profile-details-layout">
          <div className="profile-fields">
            <div className="field">
              <label htmlFor="firstName">Name</label>
              <input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="surname">Surname</label>
              <input id="surname" value={surname} onChange={(event) => setSurname(event.target.value)} />
            </div>
            <div className="field profile-email-field">
              <label htmlFor="email">Email</label>
              <input id="email" value={email} readOnly />
            </div>
            {profileChanged || !emailVerified ? (
              <div className="dashboard-panel-links">
                {profileChanged ? <button className="button" type="button" onClick={saveProfile}>Save profile</button> : null}
                {!emailVerified ? (
                  <button className="button-secondary" type="button" onClick={resendVerification}>Send verification email</button>
                ) : null}
              </div>
            ) : null}
            {renderStatus(profileStatus)}
            {renderStatus(verifyStatus)}
          </div>
          <div className="profile-avatar-field">
            <div className="profile-avatar-frame">
              {avatarUrl ? <img className="profile-avatar" src={avatarUrl} alt="Profile" /> : <span className="profile-avatar profile-avatar-fallback">{firstName.trim().slice(0, 1).toUpperCase() || "V"}</span>}
              {avatarUrl ? (
                <button className="profile-avatar-remove" type="button" onClick={() => void removeAvatar()} aria-label="Remove profile photo">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M6 7l1 13h10l1-13" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                </button>
              ) : null}
            </div>
            <div className="profile-avatar-actions">
              <input ref={avatarInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }} />
              <button className="button-secondary" type="button" onClick={() => avatarInputRef.current?.click()}>Edit photo</button>
            </div>
            {avatarStatus.state !== "idle" ? <p className="muted">{avatarStatus.state === "loading" ? "Uploading..." : avatarStatus.message}</p> : null}
          </div>
        </div>
      </div>

      <div className="preference-settings-grid">
        <div className="profile-section-copy">
          <h2>Timezone &amp; preferences</h2>
          <p className="muted">Let us know the time zone and format.</p>
        </div>
        <div className="preference-fields">
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" value={city} onChange={(event) => setCity(event.target.value)} onBlur={() => void savePreferences({ city })} />
          </div>
          <div className="field">
            <label htmlFor="timezone">Timezone</label>
            <select id="timezone" value={timezone} onChange={(event) => { setTimezone(event.target.value); void savePreferences({ timezone: event.target.value }); }}>
              <option value="Africa/Nairobi">UTC/GMT +3 hours</option>
              <option value="UTC">UTC/GMT +0 hours</option>
              <option value="America/New_York">UTC/GMT -5 hours</option>
              <option value="Europe/London">UTC/GMT +0 hours</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="dateFormat">Date &amp; time format</label>
            <select id="dateFormat" value={dateFormat} onChange={(event) => { setDateFormat(event.target.value); void savePreferences({ date_format: event.target.value }); }}>
              <option>dd/MM/yyyy HH:mm</option>
              <option>MM/dd/yyyy h:mm a</option>
              <option>yyyy-MM-dd HH:mm</option>
            </select>
          </div>
        </div>
        {preferencesStatus.state !== "idle" ? <p className="muted settings-preferences-status">{preferencesStatus.state === "loading" ? "Saving preferences..." : preferencesStatus.message}</p> : null}
      </div>

      <div id="security" className="form settings-subsection">
        <h3>Password</h3>
        <p className="muted">Update your password.</p>
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="dashboard-panel-links">
          <button className="button-secondary" type="button" onClick={changePassword}>Change password</button>
        </div>
        {renderStatus(passwordStatus)}
      </div>
    </section>
  );
}
