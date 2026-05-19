import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { postAuthEndpoint } from "@/lib/auth";

export async function POST(request: NextRequest) {
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
  const authResponse = await postAuthEndpoint(request, "/sign-up/email", {
    name: String(form.get("name") || ""),
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
    callbackURL: new URL("/dashboard", request.url).toString()
  });
  if (authResponse.ok) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    authResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append(key, value);
      }
    });
    response.cookies.set("vivadeo_workspace", workspace?.id || String(form.get("workspace") || "new-workspace"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    return response;
  }

  return new NextResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers
  });
}
