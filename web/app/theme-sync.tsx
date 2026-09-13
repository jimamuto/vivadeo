"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export type ThemePreference = "light" | "dark" | "system";

const AUTH_ROUTE_PATTERN = /^\/(?:sign-in|sign-up|forgot-password|reset-password|verify-email|invite)(?:\/|$)/;

function usesFixedLightTheme(pathname: string) {
  return pathname === "/" || AUTH_ROUTE_PATTERN.test(pathname);
}

export function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
}

export function ThemeSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    if (usesFixedLightTheme(pathname)) {
      document.documentElement.dataset.theme = "light";
      return;
    }

    const savedPreference = document.documentElement.dataset.themePreference;
    if (savedPreference === "light" || savedPreference === "dark" || savedPreference === "system") {
      applyTheme(savedPreference);
    }

    const syncSystemTheme = () => {
      if (document.documentElement.dataset.themePreference === "system") applyTheme("system");
    };

    media.addEventListener("change", syncSystemTheme);
    if (!document.querySelector(".dashboard-wrap")) {
      return () => media.removeEventListener("change", syncSystemTheme);
    }
    void fetch("/api/profile/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as { theme?: ThemePreference };
        if (payload.theme === "light" || payload.theme === "dark" || payload.theme === "system") {
          applyTheme(payload.theme);
        }
      })
      .catch(() => undefined);

    return () => media.removeEventListener("change", syncSystemTheme);
  }, [pathname]);

  return null;
}
