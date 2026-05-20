import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

export type Job = {
  id: string;
  kind: string;
  status: string;
  progress: number;
  message: string | null;
  error: string | null;
  video_id: string | null;
  clip_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Video = {
  id: string;
  filename: string;
  status: string;
  duration: number | null;
  source_type: string;
  source_uri: string;
  object_key?: string | null;
  url?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceStats = {
  total_videos: number;
  total_chunks: number;
  total_storage_bytes: number;
};

export type VideoChunk = {
  id: string;
  organization_id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  embedding_backend: string;
  embedding_model: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function fetchDashboardData(workspace: string) {
  async function fetchFromBackend<T>(path: string): Promise<T | []> {
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

  const [videos, jobs, stats] = await Promise.all([
    fetchFromBackend<Video[]>("/v1/videos"),
    fetchFromBackend<Job[]>("/v1/jobs"),
    fetchFromBackend<WorkspaceStats>("/v1/stats"),
  ]);

  return {
    videos: Array.isArray(videos) ? videos : [],
    jobs: Array.isArray(jobs) ? jobs : [],
    stats: Array.isArray(stats) ? { total_videos: 0, total_chunks: 0, total_storage_bytes: 0 } : stats,
  };
}
