"use client";

import { useState } from "react";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function PasswordSettingsPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      setStatus({ state: "error", message: "Enter current and new password." });
      return;
    }
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }),
      });
      if (!response.ok) throw new Error(`Password change failed (${response.status})`);
      setCurrentPassword("");
      setNewPassword("");
      setStatus({ state: "ok", message: "Password changed." });
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Password change failed" });
    }
  }

  return (
    <section id="security" className="settings-section settings-standalone-section">
      <div className="settings-section-head">
        <h2>Password</h2>
        <p className="muted">Update your password.</p>
      </div>
      <div className="form settings-compact-form">
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </div>
        <div className="dashboard-panel-links">
          <button className="button-secondary" type="button" onClick={changePassword}>Change password</button>
        </div>
        {status.state !== "idle" ? <p className="muted" role="status">{status.state === "loading" ? "Working..." : status.message}</p> : null}
      </div>
    </section>
  );
}
