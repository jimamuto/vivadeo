"use client";

import { useEffect, useState } from "react";

type SessionRecord = {
  token: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type FetchStatus = { state: "idle" | "loading" | "ok" | "error"; message?: string };

function fmtDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SessionPanel() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [status, setStatus] = useState<FetchStatus>({ state: "idle" });

  async function loadSessions() {
    try {
      const response = await fetch("/api/auth/list-sessions");
      if (!response.ok) throw new Error(`Session lookup failed (${response.status})`);
      const payload = (await response.json()) as SessionRecord[];
      setSessions(payload);
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Session lookup failed" });
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function revokeSession(token: string) {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error(`Revoke failed (${response.status})`);
      setStatus({ state: "ok", message: "Session revoked." });
      await loadSessions();
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Revoke failed" });
    }
  }

  async function revokeOtherSessions() {
    setStatus({ state: "loading" });
    try {
      const response = await fetch("/api/auth/revoke-other-sessions", { method: "POST" });
      if (!response.ok) throw new Error(`Revoke failed (${response.status})`);
      setStatus({ state: "ok", message: "Other sessions revoked." });
      await loadSessions();
    } catch (cause) {
      setStatus({ state: "error", message: cause instanceof Error ? cause.message : "Revoke failed" });
    }
  }

  return (
    <article className="card dashboard-panel">
      <div className="dashboard-panel-head">
        <h3>Sessions</h3>
        <p className="muted">Review active sessions and revoke anything you do not trust.</p>
      </div>
      <div className="dashboard-panel-links">
        <button type="button" className="button-secondary" onClick={revokeOtherSessions}>Revoke other sessions</button>
      </div>
      {status.state !== "idle" ? <p className="muted">{status.state === "loading" ? "Working..." : status.message}</p> : null}
      {sessions.length === 0 ? <p className="muted">No active sessions returned.</p> : (
        <div className="job-history-list">
          {sessions.map((session) => (
            <article key={session.token} className="detail-card">
              <span>{session.ipAddress || "Unknown IP"}</span>
              <strong>{session.userAgent || "Unknown device"}</strong>
              <p className="muted">Created {fmtDate(session.createdAt)} • Expires {fmtDate(session.expiresAt)}</p>
              <div className="dashboard-panel-links">
                <button type="button" className="button-secondary" onClick={() => revokeSession(session.token)}>Revoke session</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
