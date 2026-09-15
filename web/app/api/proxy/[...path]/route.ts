import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { getWorkspaceRoleForRequest } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { consumeCredit, ensureWorkspaceAllowance, refundCredit } from "@/lib/billing";
import { invalidateDashboardData } from "@/app/dashboard/dashboard-data";

function requiresEditorAccess(method: string, targetPath: string) {
  if (method === "GET" || method === "HEAD") return false;
  if (!targetPath.startsWith("/v1/")) return false;
  return true;
}

function requiresManagerAccess(method: string, targetPath: string) {
  return targetPath === "/v1/settings/llm/ollama-models"
    || (targetPath === "/v1/settings/llm" && method !== "GET" && method !== "HEAD");
}

async function forward(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const targetPath = `/${path.join("/")}`;
  const workspace = request.cookies.get("vivadeo_workspace")?.value;
  const role = await getWorkspaceRoleForRequest(
    request,
    workspace || "default-workspace",
  );
  if (!role) {
    return NextResponse.json(
      { detail: "Workspace access is required." },
      { status: 401 },
    );
  }
  if (requiresEditorAccess(request.method, targetPath) && role === "viewer") {
    return NextResponse.json(
      { detail: "Viewer role cannot modify workspace content." },
      { status: 403 },
    );
  }
  if (requiresManagerAccess(request.method, targetPath) && role !== "owner" && role !== "admin") {
    return NextResponse.json(
      { detail: "Only workspace owners and admins can manage answer providers." },
      { status: 403 },
    );
  }
  const backendUrl = getBackendUrl(targetPath);
  const headers = getBackendHeaders(
    undefined,
    workspace,
  );
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  const method = request.method;
  let body: BodyInit | undefined;
  let creditOperationId: string | null = null;

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
      if (targetPath === "/v1/search/chat") {
        const payload = JSON.parse(body || "{}") as { provider?: string };
        if (!payload.provider || payload.provider === "vivadeo-auto") {
          await ensureWorkspaceAllowance(workspace || "default-workspace");
          creditOperationId = request.headers.get("x-vivadeo-operation-id") || randomUUID();
          const allowed = await consumeCredit(workspace || "default-workspace", "answers", 1, creditOperationId);
          if (!allowed) return NextResponse.json({ detail: "This workspace has used its monthly answer allowance. Upgrade or wait for the next reset." }, { status: 402 });
        }
      }
    } else if (contentType) {
      const form = await request.formData();
      const payload = Object.fromEntries(form.entries());
      body = JSON.stringify(payload);
      headers.set("Content-Type", "application/json");
    }
  }

  let response: Response;
  try {
    response = await fetch(backendUrl, {
      method, headers, body,
      // Required by Node.js fetch when body is a ReadableStream.
      // @ts-expect-error: duplex is not in the TS types yet but is required at runtime.
      duplex: "half",
    });
  } catch (error) {
    if (creditOperationId) await refundCredit(workspace || "default-workspace", creditOperationId);
    throw error;
  }
  if (creditOperationId && !response.ok) await refundCredit(workspace || "default-workspace", creditOperationId);
  if (method === "GET" || method === "HEAD") {
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => responseHeaders.set(key, value));
    return new NextResponse(method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  const text = await response.text();
  const responseBody = response.status === 204 || response.status === 304 ? null : text;
  if (response.ok) invalidateDashboardData(workspace || "default-workspace");
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
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
