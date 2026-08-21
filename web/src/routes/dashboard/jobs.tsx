import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "~/components/dashboard-shell";
import { fetchDashboardData } from "~/components/dashboard-data";
import { JobsPanel } from "~/components/dashboard-ui";

async function JobsPage() {
  const cookieStore = { get: (_name: string) => undefined as { value: string } | undefined };
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session: any = null;
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

export const Route = createFileRoute("/dashboard/jobs")({ component: JobsPage as any });
