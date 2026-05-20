import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { JobsPanel } from "../dashboard-ui";

export default async function JobsPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const { jobs } = await fetchDashboardData(activeWorkspace);

  return (
      <DashboardShell workspace={activeWorkspace}>
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
