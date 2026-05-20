import { cookies } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { LibraryPanel } from "../dashboard-ui";

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const { videos, jobs } = await fetchDashboardData(activeWorkspace);

  return (
    <DashboardShell workspace={activeWorkspace}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head">
          <div>
            <div className="eyebrow">Library</div>
            <h1>Video catalog with detail.</h1>
            <p className="muted">Status, source metadata, upload time, quick hop into job or clip flow.</p>
          </div>
        </section>
        <div className="dashboard-summary-row">
          <article className="summary-chip">
            <span>Library size</span>
            <strong>{videos.length}</strong>
          </article>
          <article className="summary-chip">
            <span>Ready videos</span>
            <strong>{videos.filter((video) => video.status === "ready").length}</strong>
          </article>
          <article className="summary-chip">
            <span>Failed ingest</span>
            <strong>{jobs.filter((job) => job.status === "failed").length}</strong>
          </article>
        </div>
        <LibraryPanel videos={videos} jobs={jobs} />
      </div>
    </DashboardShell>
  );
}
