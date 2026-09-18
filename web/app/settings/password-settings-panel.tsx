"use client";

import { Eye, EyeOff, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field security-password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} />
        <button className="password-visibility-toggle" type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordSettingsPanel({ emailVerified = false }: { emailVerified?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) return setStatus({ state: "error", message: "Complete all password fields." });
    if (newPassword !== confirmPassword) return setStatus({ state: "error", message: "New passwords do not match." });
    if (newPassword.length < 8) return setStatus({ state: "error", message: "New password must be at least 8 characters." });
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: false }) });
      if (!response.ok) throw new Error(`Password change failed (${response.status})`);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setStatus({ state: "ok", message: "Password changed." });
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Password change failed" });
    }
  }

  return (
    <div className="security-settings-stack">
      <section id="security" className="settings-section settings-standalone-section security-password-section">
        <div className="settings-section-head"><h2>Password</h2><p className="muted">Use a strong password you do not reuse elsewhere.</p></div>
        <div className="form security-password-form">
          <div className="security-password-grid">
            <PasswordField id="currentPassword" label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordField id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          </div>
          <PasswordField id="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          <p className="security-password-hint">At least 8 characters. Use a mix of letters, numbers, and symbols.</p>
          <div className="dashboard-panel-links"><button className="button" type="button" onClick={changePassword} disabled={status.state === "loading"}>{status.state === "loading" ? "Changing password…" : "Change password"}</button></div>
          {status.state !== "idle" ? <p className={`muted security-form-status is-${status.state}`} role={status.state === "error" ? "alert" : "status"}>{status.state === "loading" ? "Working…" : status.message}</p> : null}
        </div>
      </section>

      <section className="settings-section security-methods-section">
        <div className="settings-section-head"><h2>Two-factor authentication</h2><p className="muted">Add another layer of protection when you sign in.</p></div>
        <div className="security-method-list">
          <div className="security-method-row"><span className="security-method-icon"><ShieldCheck aria-hidden="true" /></span><span><strong>Email verification</strong><small>{emailVerified ? "Your email is verified and can be used for account recovery." : "Verify your email to improve account recovery."}</small></span><span className={`security-method-badge ${emailVerified ? "is-active" : ""}`}>{emailVerified ? "Active" : "Verify email"}</span></div>
          <div className="security-method-row is-disabled"><span className="security-method-icon"><LockKeyhole aria-hidden="true" /></span><span><strong>Authenticator app</strong><small>Use a time-based code from an authenticator app.</small></span><span className="security-method-badge">Coming soon</span></div>
          <div className="security-method-row is-disabled"><span className="security-method-icon"><Smartphone aria-hidden="true" /></span><span><strong>SMS recovery</strong><small>Recover access with a verified phone number.</small></span><span className="security-method-badge">Coming soon</span></div>
        </div>
      </section>
    </div>
  );
}
