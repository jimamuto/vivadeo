"use client";

import { useEffect, useState } from "react";

export function NotificationSettingsPanel() {
  const [email, setEmail] = useState(true);
  const [browser, setBrowser] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => { void fetch("/api/notifications").then((response) => response.json()).then((data) => { setEmail(data.preferences?.ingest_email_notifications !== false); setBrowser(data.preferences?.ingest_browser_notifications === true); }); }, []);

  async function save(nextEmail: boolean, nextBrowser: boolean) {
    setEmail(nextEmail); setBrowser(nextBrowser); setStatus("Saving…");
    const response = await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: nextEmail, browser: nextBrowser }) });
    setStatus(response.ok ? "Saved" : "Could not save preferences");
  }

  async function enableBrowser() {
    if (!("Notification" in window)) return setStatus("Browser notifications are not supported here.");
    const permission = await Notification.requestPermission();
    await save(email, permission === "granted");
    if (permission !== "granted") setStatus("Browser permission was not granted.");
  }

  return <section className="settings-section notification-settings"><header><h2>Processing notifications</h2><p>Choose how Vivadeo tells you when video preparation finishes or needs attention.</p></header><label><span><strong>Email</strong><small>Receive an email when a video is ready or processing fails.</small></span><input type="checkbox" checked={email} onChange={(event) => void save(event.target.checked, browser)} /></label><label><span><strong>Browser</strong><small>Show a notification while Vivadeo is open in this browser.</small></span><input type="checkbox" checked={browser} onChange={(event) => event.target.checked ? void enableBrowser() : void save(email, false)} /></label><p className="muted" aria-live="polite">{status}</p></section>;
}
