import { getBackendHeaders, getBackendUrl } from "./backend";

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  plan: string;
};

export type Job = {
  id: string;
  organization_id: string;
  kind: string;
  status: string;
  progress: number;
  message?: string | null;
  error?: string | null;
  video_id?: string | null;
  clip_id?: string | null;
};

export type Video = {
  id: string;
  organization_id: string;
  source_type: string;
  source_uri: string;
  filename: string;
  status: string;
  duration?: number | null;
  object_key?: string | null;
  url?: string | null;
};

export type SearchResult = {
  chunk_id: string;
  organization_id: string;
  video_id: string;
  filename: string;
  source_uri: string;
  start_time: number;
  end_time: number;
  similarity_score: number;
  distance?: number;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(getBackendUrl(path), {
    headers: getBackendHeaders()
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(getBackendUrl(path), {
    method: "POST",
    headers: getBackendHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
