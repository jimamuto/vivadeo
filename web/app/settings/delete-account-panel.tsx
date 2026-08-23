"use client";

import { useState } from "react";

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

export function DeleteAccountPanel() {
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function requestDeletion() {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackURL: "/sign-in" }),
      });
      if (!response.ok) throw new Error(`Delete request failed (${response.status})`);
      const payload = (await response.json()) as { message?: string };
      setStatus({ state: "ok", message: payload.message || "Deletion verification sent." });
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Delete request failed" });
    }
  }

  return (
    <section id="privacy" className="settings-section settings-danger-section">
      <div className="settings-section-head">
        <h2>Delete account</h2>
        <p className="muted">Request a confirmation link before permanently deleting your account.</p>
      </div>
      <div className="dashboard-panel-links">
        <button type="button" className="button-secondary" onClick={requestDeletion}>Request account deletion</button>
      </div>
      {status.state !== "idle" ? <p className="muted">{status.state === "loading" ? "Working..." : status.message}</p> : null}
    </section>
  );
}
