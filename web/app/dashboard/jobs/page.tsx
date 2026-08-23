import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { JobsPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";

export default async function JobsPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { jobs } = await fetchDashboardData(activeWorkspace);

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={displayName}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head jobs-page-head">
          <div>
            <h1>Workspace jobs</h1>
            <p className="muted">Track ingestion and processing jobs.</p>
          </div>
        </section>
        <JobsPanel jobs={jobs} />
      </div>
    </DashboardShell>
  );
}
