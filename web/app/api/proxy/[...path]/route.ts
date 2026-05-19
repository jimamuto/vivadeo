import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetPath = `/${path.join("/")}`;
  const backendUrl = getBackendUrl(targetPath);
  const headers = getBackendHeaders(undefined, request.cookies.get("vivadeo_workspace")?.value);
  const method = request.method;
  let body: BodyInit | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data") && targetPath.endsWith("/v1/videos/upload")) {
      body = await request.arrayBuffer();
      headers.set("Content-Type", contentType);
    } else if (contentType.includes("application/json")) {
      body = await request.text();
      headers.set("Content-Type", "application/json");
    } else {
      const form = await request.formData();
      const payload = Object.fromEntries(form.entries());
      body = JSON.stringify(payload);
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(backendUrl, {
    method,
    headers,
    body
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json"
    }
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
