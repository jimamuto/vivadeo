import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "./dashboard-shell";
import { fetchDashboardData } from "./dashboard-data";
import { OverviewPanel } from "./dashboard-ui";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs, stats } = await fetchDashboardData(activeWorkspace);

  return (
    <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
      <OverviewPanel activeWorkspace={activeWorkspace} videos={videos} jobs={jobs} stats={stats} />
    </DashboardShell>
  );
}
