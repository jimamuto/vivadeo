import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { IngestPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add video", description: "Upload videos and follow their preparation for Vivadeo search." };

export default async function IngestPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs } = await fetchDashboardData(activeWorkspace);

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={displayName}>
      <div className="dashboard-stack">
        <IngestPanel workspace={activeWorkspace} videos={videos} jobs={jobs} />
      </div>
    </DashboardShell>
  );
}
