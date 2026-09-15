import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";
import { OutputPanel } from "./output-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Output", description: "Shape verified video evidence into a usable, attributed output." };

export default async function OutputPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session?.user?.name || session?.user?.email || "Guest";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <OutputPanel />
      </div>
    </DashboardShell>
  );
}
