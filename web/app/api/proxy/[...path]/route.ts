import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { getWorkspaceRoleForRequest } from "@/lib/auth";

function requiresEditorAccess(method: string, targetPath: string) {
  if (method === "GET" || method === "HEAD") return false;
  if (!targetPath.startsWith("/v1/")) return false;
  return true;
}

async function forward(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const targetPath = `/${path.join("/")}`;
  const workspace = request.cookies.get("vivadeo_workspace")?.value;
  if (requiresEditorAccess(request.method, targetPath)) {
    const role = await getWorkspaceRoleForRequest(
      request,
      workspace || "default-workspace",
    );
    if (role === "viewer") {
      return NextResponse.json(
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
      // Stream the raw body straight through — avoids buffering the entire
      // video in memory and sidesteps Next.js body-size limits.
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
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return forward(request, (await params).path);
}
