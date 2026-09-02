import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vivadeo",
  description: "Workspace-first video search, clip generation, and review."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
