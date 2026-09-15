import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "../dashboard-shell";
import { fetchDashboardData } from "../dashboard-data";
import { LibraryPanel } from "../dashboard-ui";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Library", description: "Organize and revisit videos in your Vivadeo workspace." };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ video_id?: string; t?: string; view?: string; folder?: string; folder_name?: string }>;
}) {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const displayName = session?.user?.name || session?.user?.email || "Guest";
  const profileInitial = displayName.trim().slice(0, 1).toUpperCase();
  const { videos, jobs } = await fetchDashboardData(activeWorkspace);
  const { video_id: selectedVideoId = "", t = "", view = "all", folder = "", folder_name: folderName = "" } = await searchParams;
  const selectedStartTime = t && Number.isFinite(Number(t)) ? Math.max(0, Number(t)) : undefined;
  const librarySection = view === "folders" ? "Folders" : view === "unorganized" ? "Unorganized" : view === "folder" && folderName ? folderName : "All videos";

  return (
      <DashboardShell workspace={activeWorkspace} profileInitial={profileInitial} profileName={displayName} breadcrumbDetail={librarySection}>
      <div className="dashboard-stack">
        <LibraryPanel videos={videos} jobs={jobs} initialVideoId={selectedVideoId} initialStartTime={selectedStartTime} initialView={view} initialFolder={folder} />
      </div>
    </DashboardShell>
  );
}
