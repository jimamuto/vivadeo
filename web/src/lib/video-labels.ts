const VIDEO_LABELS_KEY = "vivadeo.video-labels";

export type VideoLabels = Record<string, string[]>;

export function readVideoLabels(): VideoLabels {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VIDEO_LABELS_KEY);
    return raw ? (JSON.parse(raw) as VideoLabels) : {};
  } catch {
    return {};
  }
}

export function writeVideoLabels(labels: VideoLabels) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIDEO_LABELS_KEY, JSON.stringify(labels));
}
