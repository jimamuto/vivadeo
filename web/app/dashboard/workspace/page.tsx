import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { WorkspacePanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { stats } = await import("../dashboard-data").then((mod) =>
    mod.fetchDashboardData(activeWorkspace),
  );

  return (
    <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Workspace</div>
            <h1>Switch context, no clutter.</h1>
            <p className="muted">One page for workspace state and account actions.</p>
          </div>
        </section>
        <div className="workspace-grid">
          <article className="summary-chip summary-chip-large">
            <span>Active workspace</span>
            <strong>{activeWorkspace}</strong>
            <p className="muted">Current org context for uploads, jobs, and clips.</p>
          </article>
          <WorkspacePanel activeWorkspace={activeWorkspace} stats={stats} />
        </div>
      </div>
    </DashboardShell>
  );
}
