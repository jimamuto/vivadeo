import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { JobsPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";

export default async function JobsPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session?.user?.name || session?.user?.email || "Guest";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { jobs, videos } = await fetchDashboardData(activeWorkspace);

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={displayName}>
      <div className="dashboard-stack">
        <JobsPanel jobs={jobs} videos={videos} referenceTime={new Date().toISOString()} />
      </div>
    </DashboardShell>
  );
}
