"use client";

import Link from "next/link";
import { useState } from "react";
import { CookieSettingsButton } from "@/components/cookie-consent";
import { contactEmail } from "@/lib/site";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function DeleteAccountPanel() {
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"confirm" | "code">("confirm");
  const [code, setCode] = useState("");

  async function sendDeletionCode() {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/privacy/delete/request", { method: "POST" });
      const payload = await response.json() as { detail?: string; message?: string };
      if (!response.ok) throw new Error(payload.detail || `Delete request failed (${response.status})`);
      setStep("code");
      setStatus({ state: "ok", message: payload.message || "Deletion code sent." });
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Delete request failed" });
    }
  }

  async function confirmDeletion() {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/privacy/delete/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const payload = await response.json() as { detail?: string; message?: string };
      if (!response.ok) throw new Error(payload.detail || payload.message || "That code is invalid or expired.");
      window.location.assign("/sign-in?deleted=1");
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Could not delete account." });
    }
  }

  function openModal() {
    setStep("confirm"); setCode(""); setStatus({ state: "idle" }); setModalOpen(true);
  }

  return (
    <div className="privacy-settings-stack">
      <section className="settings-section privacy-controls-section">
        <div className="settings-section-head"><h2>Your data and privacy choices</h2><p className="muted">Review how Vivadeo handles your information and choose what happens next.</p></div>
        <div className="privacy-control-list">
          <div className="privacy-control-row"><div><strong>Privacy policy</strong><p>See what we collect, why we use it, and how long we keep it.</p></div><Link className="button-secondary" href="/privacy">Read policy</Link></div>
          <div className="privacy-control-row"><div><strong>Cookie preferences</strong><p>Essential cookies keep Vivadeo running. Optional analytics can be changed at any time.</p></div><CookieSettingsButton /></div>
          <div className="privacy-control-row"><div><strong>Request a copy of your data</strong><p>Contact us to request an export of the personal data associated with your account.</p></div><a className="button-secondary" href={`mailto:${contactEmail}?subject=Vivadeo%20data%20access%20request`}>Request data</a></div>
        </div>
      </section>

      <section id="privacy" className="settings-section settings-danger-section">
        <div className="settings-section-head"><h2>Delete account</h2><p className="muted">Request a confirmation code before permanently deleting your account and associated access.</p></div>
        <div className="dashboard-panel-links"><button type="button" className="button-secondary" onClick={openModal}>Request account deletion</button></div>
      </section>

      {modalOpen ? <div className="privacy-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="privacy-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
        <header><div><p className="eyebrow">Account deletion</p><h2 id="delete-account-modal-title">{step === "confirm" ? "Are you sure?" : "Enter your email code"}</h2></div><button type="button" className="privacy-modal-close" aria-label="Close deletion dialog" onClick={() => setModalOpen(false)}>×</button></header>
        {step === "confirm" ? <><p>This permanently deletes your account and signs you out of Vivadeo. This action cannot be undone.</p><div className="privacy-modal-actions"><button type="button" className="button-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="button" className="button" onClick={() => void sendDeletionCode()} disabled={status.state === "loading"}>{status.state === "loading" ? "Sending…" : "Send email code"}</button></div></> : <><p>We sent a six-digit code to your account email. Enter it below to confirm permanent deletion.</p><label className="privacy-delete-code-field"><span>Email code</span><input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus /></label><div className="privacy-modal-actions"><button type="button" className="button-secondary" onClick={() => setStep("confirm")}>Back</button><button type="button" className="button" onClick={() => void confirmDeletion()} disabled={code.length !== 6 || status.state === "loading"}>{status.state === "loading" ? "Deleting…" : "Delete account"}</button></div></>}
        {status.state === "error" ? <p className="privacy-modal-error" role="alert">{status.message}</p> : null}
      </section></div> : null}
    </div>
  );
}
