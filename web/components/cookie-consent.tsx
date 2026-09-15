"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_COOKIE } from "./posthog-analytics";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!document.cookie.split("; ").some((value) => value.startsWith(`${CONSENT_COOKIE}=`))), []);
  function choose(value: "essential" | "analytics") {
    document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setVisible(false);
    if (value === "analytics") window.location.reload();
  }
  if (!visible) return null;
  return <aside className="cookie-consent" aria-label="Cookie preferences"><div><strong>Your privacy, your choice</strong><p>Vivadeo uses essential cookies to run the service. With permission, anonymous product analytics help us improve it. <Link href={"/privacy" as any}>Privacy details</Link></p></div><div><button className="button-secondary" onClick={() => choose("essential")}>Essential only</button><button onClick={() => choose("analytics")}>Allow analytics</button></div></aside>;
}

export function CookieSettingsButton() {
  return <button className="cookie-settings-link" type="button" onClick={() => { document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`; window.dispatchEvent(new Event("vivadeo:cookie-consent-reset")); window.location.reload(); }}>Cookie settings</button>;
}
