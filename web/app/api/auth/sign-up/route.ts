import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { authHandlers } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authRequest = request.clone();
  const form = await request.formData();
  const workspaceName = String(form.get("workspace") || "New workspace");
  const backendResponse = await fetch(getBackendUrl("/v1/workspaces"), {
    method: "POST",
    headers: getBackendHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      name: workspaceName
    })
  });
  const workspace = backendResponse.ok ? await backendResponse.json() : null;
  const authResponse = await authHandlers.POST(authRequest);
  if (authResponse.status !== 501) {
    const response = new NextResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers
    });
    response.cookies.set("vivadeo_workspace", workspace?.id || String(form.get("workspace") || "new-workspace"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    return response;
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("vivadeo_session", "demo-session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  response.cookies.set("vivadeo_workspace", workspace?.id || String(form.get("workspace") || "new-workspace"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
