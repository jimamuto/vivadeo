import { cookies } from "next/headers";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import DashboardClient, { type Job, type Video } from "./DashboardClient";

async function fetchFromBackend<T>(
  path: string,
  workspace: string,
): Promise<T[]> {
  try {
    const res = await fetch(getBackendUrl(path), {
      headers: getBackendHeaders(undefined, workspace),
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const activeWorkspace =
    cookieStore.get("vivadeo_workspace")?.value || "default-workspace";

  const [videos, jobs] = await Promise.all([
    fetchFromBackend<Video>("/v1/videos", activeWorkspace),
    fetchFromBackend<Job>("/v1/jobs", activeWorkspace),
  ]);

  return (
    <DashboardClient
      activeWorkspace={activeWorkspace}
      videos={videos}
      jobs={jobs}
    />
  );
}
