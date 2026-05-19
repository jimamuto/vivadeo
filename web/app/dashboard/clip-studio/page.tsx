import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { ClipStudioPanel } from "../dashboard-ui";

export default async function ClipStudioPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={activeWorkspace}>
      <div className="dashboard-solo">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Clip studio</div>
            <h1>Trim, then ship.</h1>
            <p className="muted">Dedicated view for clip creation keeps focus tight.</p>
          </div>
        </section>
        <ClipStudioPanel />
      </div>
    </DashboardShell>
  );
}
