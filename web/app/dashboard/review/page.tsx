import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "../dashboard-shell";
import { ReviewPanel } from "./review-panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review evidence", description: "Verify video evidence and preserve its source context." };

export default async function ReviewPage() {
  const workspace = (await cookies()).get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session?.user?.name || session?.user?.email || "Guest";

  return (
    <DashboardShell workspace={workspace} profileInitial={displayName.trim().slice(0, 1).toUpperCase()} profileName={displayName}>
      <div className="workflow-step-page">
        <ReviewPanel />
      </div>
    </DashboardShell>
  );
}
