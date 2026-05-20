import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { IngestPanel } from "../dashboard-ui";

export default async function IngestPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={activeWorkspace}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Ingest</div>
            <h1>One source, one queue.</h1>
            <p className="muted">Upload file or queue URL without loading clip or job tables at same time.</p>
          </div>
        </section>
        <div className="dashboard-summary-row">
          <article className="summary-chip">
            <span>Primary lane</span>
            <strong>Upload first</strong>
          </article>
          <article className="summary-chip">
            <span>Secondary lane</span>
            <strong>URL queue</strong>
          </article>
          <article className="summary-chip">
            <span>Focus</span>
            <strong>One task per view</strong>
          </article>
        </div>
        <IngestPanel workspace={activeWorkspace} />
      </div>
    </DashboardShell>
  );
}
