import { cookies } from "next/headers";
import { DashboardShell } from "./dashboard-shell";
import { fetchDashboardData } from "./dashboard-data";
import { OverviewPanel } from "./dashboard-ui";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const { videos, jobs, stats } = await fetchDashboardData(activeWorkspace);

  return (
    <DashboardShell workspace={activeWorkspace}>
      <OverviewPanel activeWorkspace={activeWorkspace} videos={videos} jobs={jobs} stats={stats} />
    </DashboardShell>
  );
}
