import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

export type Job = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  message: string | null;
  error: string | null;
  video_id: string | null;
};

export type Video = {
  id: string;
  filename: string;
  status: string;
  duration: number | null;
  source_type: string;
};

export async function fetchDashboardData(workspace: string) {
  async function fetchFromBackend<T>(path: string): Promise<T[]> {
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

  const [videos, jobs] = await Promise.all([
    fetchFromBackend<Video>("/v1/videos"),
    fetchFromBackend<Job>("/v1/jobs"),
  ]);

  return { videos, jobs };
}
