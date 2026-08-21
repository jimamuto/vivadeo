import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "~/components/dashboard-shell";
import { fetchDashboardData } from "~/components/dashboard-data";
import { OverviewPanel } from "~/components/dashboard-ui";

async function DashboardPage() {
  const cookieStore = { get: (_name: string) => undefined as { value: string } | undefined };
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session: any = null;
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs, stats } = await fetchDashboardData(activeWorkspace);

  return (
    <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
      <OverviewPanel activeWorkspace={activeWorkspace} videos={videos} jobs={jobs} stats={stats} />
    </DashboardShell>
  );
}

export const Route = createFileRoute("/dashboard/")({ component: DashboardPage as any });
