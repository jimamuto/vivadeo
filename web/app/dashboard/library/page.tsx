import { cookies } from "next/headers";
import { headers } from "next/headers";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { LibraryPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ video_id?: string }>;
}) {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || session?.user?.email || "V";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs } = await fetchDashboardData(activeWorkspace);
  const { video_id: selectedVideoId = "" } = await searchParams;

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={displayName}>
      <div className="dashboard-stack">
        <section className="dashboard-section-head library-page-head">
          <div>
            <h1>Video library</h1>
          </div>
        </section>
        <LibraryPanel videos={videos} jobs={jobs} initialVideoId={selectedVideoId} />
      </div>
    </DashboardShell>
  );
}
