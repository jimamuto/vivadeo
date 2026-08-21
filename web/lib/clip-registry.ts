import type { Clip } from "./api";

const CLIP_REGISTRY_KEY = "vivadeo.clip-registry";

export type SavedClip = {
  id: string;
  video_id: string;
  status: string;
  start_time: number;
  end_time: number;
  url?: string | null;
  job_id?: string | null;
  name: string;
  notes: string;
  collection: string;
  created_at: string;
};

export function readSavedClips(): SavedClip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLIP_REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as SavedClip[]) : [];
  } catch {
    return [];
  }
}

export function writeSavedClips(clips: SavedClip[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIP_REGISTRY_KEY, JSON.stringify(clips));
}

export function upsertSavedClip(clip: Clip, existing?: Partial<SavedClip>) {
  const current = readSavedClips();
  const nextClip: SavedClip = {
    id: clip.id,
    video_id: clip.video_id,
    status: clip.status,
    start_time: clip.start_time,
    end_time: clip.end_time,
    url: clip.url,
    job_id: clip.job_id,
    name: existing?.name || `Clip ${clip.start_time.toFixed(1)}-${clip.end_time.toFixed(1)}`,
    notes: existing?.notes || "",
    collection: existing?.collection || "Unsorted",
    created_at: existing?.created_at || new Date().toISOString(),
  };
  writeSavedClips([nextClip, ...current.filter((item) => item.id !== clip.id)]);
  return nextClip;
}
