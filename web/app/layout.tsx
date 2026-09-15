import "./globals.css";
import type { Metadata } from "next";
import { ThemeSync } from "./theme-sync";
import { Suspense } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { PostHogAnalytics } from "@/components/posthog-analytics";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Vivadeo | Find more in every frame", template: "%s | Vivadeo" },
  description: "Search video archives, verify cited moments, and turn footage into usable evidence.",
  openGraph: { type: "website", siteName: "Vivadeo", title: "Vivadeo | Find more in every frame", description: "Search video archives, verify cited moments, and turn footage into usable evidence.", images: [{ url: "/images/landing/dashboard-overview.webp", width: 1600, height: 1000, alt: "Vivadeo video search workspace" }] },
  twitter: { card: "summary_large_image", title: "Vivadeo | Find more in every frame", description: "Search video archives, verify cited moments, and turn footage into usable evidence.", images: ["/images/landing/dashboard-overview.webp"] },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var m=document.cookie.match(/(?:^|; )vivadeo_theme=([^;]+)/);var p=m?decodeURIComponent(m[1]):'system';var a=location.pathname==='/'||/^\\/(?:sign-in|sign-up|forgot-password|reset-password|verify-email|invite)(?:\\/|$)/.test(location.pathname);var d=!a&&(p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePreference=p;}())` }} />
      </head>
      <body>
        <ThemeSync />
        <Suspense fallback={null}><PostHogAnalytics projectToken={process.env.POSTHOG_PROJECT_TOKEN} host={process.env.POSTHOG_HOST} /></Suspense>
        <main>{children}</main>
        <CookieConsent />
      </body>
    </html>
  );
}
