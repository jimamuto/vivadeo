import "./globals.css";
import type { Metadata } from "next";
import { Playfair_Display, Raleway } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const ui = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Vivadeo",
  description: "Workspace-first video search, clip generation, and review."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
