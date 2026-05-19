import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { WorkspacePanel } from "../dashboard-ui";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={activeWorkspace}>
      <section className="dashboard-section-head">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>Switch context, no clutter.</h1>
          <p className="muted">One page for workspace state and account actions.</p>
        </div>
      </section>
      <WorkspacePanel activeWorkspace={activeWorkspace} />
    </DashboardShell>
  );
}
