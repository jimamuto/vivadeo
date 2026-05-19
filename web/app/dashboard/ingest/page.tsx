import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { IngestPanel } from "../dashboard-ui";

export default async function IngestPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  return (
    <DashboardShell workspace={activeWorkspace}>
      <section className="dashboard-section-head">
        <div>
          <div className="eyebrow">Ingest</div>
          <h1>One source, one queue.</h1>
          <p className="muted">Upload file or queue URL without loading clip or job tables at same time.</p>
        </div>
      </section>
      <IngestPanel />
    </DashboardShell>
  );
}
