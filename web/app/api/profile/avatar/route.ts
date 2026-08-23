import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";

async function userId(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id || null;
}

export async function POST(request: NextRequest) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const headers = getBackendHeaders({ "Content-Type": request.headers.get("content-type") || "" }, request.cookies.get("vivadeo_workspace")?.value);
  headers.set("X-User-ID", id);
  const response = await fetch(getBackendUrl("/v1/profile/avatar"), {
    method: "POST",
    headers,
    body: request.body,
    // @ts-expect-error Next's fetch requires duplex for streamed request bodies.
    duplex: "half",
  });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(response.ok ? { ...payload, image: "/api/profile/avatar" } : payload, { status: response.status });
}

export async function GET(request: NextRequest) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const headers = getBackendHeaders(undefined, request.cookies.get("vivadeo_workspace")?.value);
  headers.set("X-User-ID", id);
  const response = await fetch(getBackendUrl("/v1/profile/avatar"), { headers });
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => responseHeaders.set(key, value));
  return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
}

export async function DELETE(request: NextRequest) {
  const id = await userId(request);
  if (!id) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  const headers = getBackendHeaders(undefined, request.cookies.get("vivadeo_workspace")?.value);
  headers.set("X-User-ID", id);
  const response = await fetch(getBackendUrl("/v1/profile/avatar"), { method: "DELETE", headers });
  return new NextResponse(null, { status: response.status });
}
