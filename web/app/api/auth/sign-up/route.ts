import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { forwardAuthCookies } from "@/lib/auth-cookies";
import { postAuthEndpoint } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-up", request.url));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const workspaceName = String(form.get("workspace") || "New workspace");
  const backendResponse = await fetch(getBackendUrl("/v1/workspaces"), {
    method: "POST",
    headers: getBackendHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      name: workspaceName,
    }),
  });
  const workspace = backendResponse.ok ? await backendResponse.json() : null;
  const authResponse = await postAuthEndpoint(request, "/sign-up/email", {
    name: String(form.get("name") || ""),
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
    callbackURL: new URL("/dashboard", request.url).toString(),
  });

  if (authResponse.ok) {
    const workspaceId =
      workspace?.id || String(form.get("workspace") || "new-workspace");

    const resendKey = process.env.RESEND_API_KEY || "";
    const emailVerificationEnabled =
      resendKey.length > 0 && resendKey !== "change-me-resend";

    // If email verification is required, tell the user to check their inbox.
    // Otherwise (dev mode) send them straight to the dashboard.
    const destination = emailVerificationEnabled
      ? "/sign-in?verify=sent"
      : "/dashboard";

    const response = NextResponse.redirect(new URL(destination, request.url));
    if (!emailVerificationEnabled) {
      forwardAuthCookies(authResponse, response);
    }
    response.cookies.set("vivadeo_workspace", workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  }

  let errorCode = "UNKNOWN";
  try {
    const body = await authResponse.json();
    errorCode = body.code || body.message || "UNKNOWN";
  } catch {
    // ignore parse failures
  }
  return NextResponse.redirect(
    new URL(`/sign-up?error=${encodeURIComponent(errorCode)}`, request.url),
  );
}
