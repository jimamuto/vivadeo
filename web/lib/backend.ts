const internalUrl = process.env.API_INTERNAL_URL || "http://api:8000";
const internalServiceKey = process.env.VIVADEO_INTERNAL_SERVICE_KEY || "change-me";
const workspaceId = process.env.VIVADEO_DEFAULT_ORG_ID || "default-workspace";

export function getBackendUrl(path: string): string {
  return new URL(path, internalUrl.endsWith("/") ? internalUrl : `${internalUrl}/`).toString();
}

export function getBackendHeaders(extra?: HeadersInit, activeWorkspaceId?: string): Headers {
  const headers = new Headers(extra);
  headers.set("X-Internal-Service-Key", internalServiceKey);
  headers.set("X-Workspace-ID", activeWorkspaceId || workspaceId);
  headers.set("Accept", "application/json");
  return headers;
}
