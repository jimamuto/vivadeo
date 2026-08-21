import { HttpRequest, HttpResponse } from "~/lib/http-compat";
import { getBackendHeaders, getBackendUrl } from "~/lib/backend";
import { getWorkspaceRoleForRequest } from "~/lib/auth";

function requiresEditorAccess(method: string, targetPath: string) {
  if (method === "GET" || method === "HEAD") return false;
  if (!targetPath.startsWith("/v1/")) return false;
  return true;
}

async function forward(
  request: HttpRequest,
  path: string[],
): Promise<HttpResponse> {
  const targetPath = `/${path.join("/")}`;
  const workspace = request.cookies.get("vivadeo_workspace")?.value;
  if (requiresEditorAccess(request.method, targetPath)) {
    const role = await getWorkspaceRoleForRequest(
      request,
      workspace || "default-workspace",
    );
    if (role === "viewer") {
      return HttpResponse.json(
        { detail: "Viewer role cannot modify workspace content." },
        { status: 403 },
      );
    }
  }
  const backendUrl = getBackendUrl(targetPath);
  const headers = getBackendHeaders(
    undefined,
    workspace,
  );
  const method = request.method;
  let body: BodyInit | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      // Stream the raw body straight through to avoid buffering large videos.
      body = request.body as ReadableStream;
      headers.set("Content-Type", contentType);
    } else if (contentType.includes("application/json")) {
      body = await request.text();
      headers.set("Content-Type", "application/json");
    } else if (contentType) {
      const form = await request.formData();
      const payload = Object.fromEntries(form.entries());
      body = JSON.stringify(payload);
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(backendUrl, {
    method,
    headers,
    body,
    // Required by Node.js fetch when body is a ReadableStream.
    // @ts-expect-error: duplex is not in the TS types yet but is required at runtime.
    duplex: "half",
  });
  const text = await response.text();
  const responseBody = response.status === 204 || response.status === 304 ? null : text;
  return new HttpResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(
  request: HttpRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function POST(
  request: HttpRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function PATCH(
  request: HttpRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function PUT(
  request: HttpRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function DELETE(
  request: HttpRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}
