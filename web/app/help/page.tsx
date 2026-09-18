import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { auth } from "@/lib/auth";
import { HelpContent } from "./help-content";

export const metadata: Metadata = { title: "Help", description: "Find answers and guidance for using Vivadeo." };

export default async function HelpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const displayName = user?.name || "Guest";
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  return <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}><HelpContent /></DashboardShell>;
}
