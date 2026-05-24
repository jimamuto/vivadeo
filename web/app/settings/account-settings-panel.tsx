"use client";

import { useState } from "react";

type AccountSettingsPanelProps = {
  email: string;
  displayName: string;
  emailVerified: boolean;
};

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function AccountSettingsPanel({
  email,
  displayName,
  emailVerified,
}: AccountSettingsPanelProps) {
  const [name, setName] = useState(displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<FetchStatus>({ state: "idle" });
  const [passwordStatus, setPasswordStatus] = useState<FetchStatus>({ state: "idle" });
  const [verifyStatus, setVerifyStatus] = useState<FetchStatus>({ state: "idle" });

  async function saveProfile() {
    setProfileStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) throw new Error(`Profile update failed (${response.status})`);
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
    <article className="surface-section dashboard-panel">
      <div className="dashboard-panel-head">
        <h1>Account settings</h1>
        <p className="muted">Profile, password, email verification, and session controls live here.</p>
      </div>

      <div className="form">
        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input id="displayName" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" value={email} readOnly />
        </div>
        <div className="dashboard-panel-links">
          <button className="button" type="button" onClick={saveProfile}>Save profile</button>
          {!emailVerified ? (
            <button className="button-secondary" type="button" onClick={resendVerification}>Send verification email</button>
          ) : (
            <span className="pill">Email verified</span>
          )}
        </div>
        {renderStatus(profileStatus)}
        {renderStatus(verifyStatus)}
      </div>

      <div className="form">
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
    </article>
  );
}
