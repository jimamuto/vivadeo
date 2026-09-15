import { NextRequest } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { getWorkspaceRoleForRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const workspace = request.cookies.get("vivadeo_workspace")?.value;
  const role = await getWorkspaceRoleForRequest(request, workspace || "default-workspace");
  if (!role) return new Response("Workspace access is required.", { status: 401 });
  const response = await fetch(getBackendUrl(`/v1/jobs/${jobId}/events`), {
    headers: getBackendHeaders(undefined, workspace),
    cache: "no-store",
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    return new Response(response.body, { status: response.status, headers: { "Cache-Control": "no-cache" } });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
