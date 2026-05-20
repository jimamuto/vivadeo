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
        <LibraryPanel videos={videos} jobs={jobs} />
      </div>
    </DashboardShell>
  );
}
