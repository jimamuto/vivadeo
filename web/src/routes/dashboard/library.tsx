import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "~/components/dashboard-shell";
import { fetchDashboardData } from "~/components/dashboard-data";
import { LibraryPanel } from "~/components/dashboard-ui";

async function LibraryPage() {
  const cookieStore = { get: (_name: string) => undefined as { value: string } | undefined };
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session: any = null;
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs } = await fetchDashboardData(activeWorkspace);

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial}>
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

export const Route = createFileRoute("/dashboard/library")({ component: LibraryPage as any });
