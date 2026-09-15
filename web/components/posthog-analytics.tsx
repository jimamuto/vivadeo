"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const CONSENT_COOKIE = "vivadeo_cookie_consent";

function hasAnalyticsConsent() {
  return document.cookie.split("; ").some((value) => value === `${CONSENT_COOKIE}=analytics`);
}

export function PostHogAnalytics({ projectToken, host }: { projectToken?: string; host?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!projectToken || !host || !hasAnalyticsConsent()) return;
    let active = true;
    void import("posthog-js").then(({ default: posthog }) => {
      if (!active) return;
      if (!posthog.__loaded) {
        posthog.init(projectToken, {
          api_host: host,
          capture_pageview: false,
          capture_pageleave: true,
          persistence: "cookie",
          loaded: (client) => client.capture("$pageview", { $current_url: window.location.href }),
        });
      } else {
        posthog.capture("$pageview", { $current_url: window.location.href });
      }
    });
    return () => { active = false; };
  }, [host, pathname, projectToken, searchParams]);

  return null;
}
