const ACTIVITY_LOG_KEY = "vivadeo.activity-log";

export type ActivityEntry = {
  id: string;
  workspace: string;
  action: string;
  detail: string;
  created_at: string;
};

export function readActivityLog(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_LOG_KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeActivityLog(entries: ActivityEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries));
}

export function appendActivity(workspace: string, action: string, detail: string) {
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspace,
    action,
    detail,
    created_at: new Date().toISOString(),
  };
  writeActivityLog([entry, ...readActivityLog()].slice(0, 100));
  return entry;
}
