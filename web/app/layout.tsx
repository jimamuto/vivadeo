import "./globals.css";
import type { Metadata } from "next";
import { ThemeSync } from "./theme-sync";

export const metadata: Metadata = {
  title: "Vivadeo",
  description: "Workspace-first video search, clip generation, and review."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var m=document.cookie.match(/(?:^|; )vivadeo_theme=([^;]+)/);var p=m?decodeURIComponent(m[1]):'system';var a=/^\\/(?:sign-in|sign-up|forgot-password|reset-password|verify-email|invite)(?:\\/|$)/.test(location.pathname);var d=!a&&(p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePreference=p;}())` }} />
        <ThemeSync />
        <main>{children}</main>
      </body>
    </html>
  );
}
