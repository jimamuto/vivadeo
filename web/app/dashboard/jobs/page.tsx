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
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Jobs</div>
            <h1>Queue state only.</h1>
            <p className="muted">Progress table lives here, not buried in mixed dashboard content.</p>
          </div>
        </section>
        <JobsPanel jobs={jobs} />
      </div>
    </DashboardShell>
  );
}
