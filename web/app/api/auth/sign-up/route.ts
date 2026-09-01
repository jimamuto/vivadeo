import { NextRequest, NextResponse } from "next/server";
import { getBackendHeaders, getBackendUrl } from "@/lib/backend";
import { forwardAuthCookies } from "@/lib/auth-cookies";
import { emailVerificationEnabled, postAuthEndpoint } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/sign-up"));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const workspaceName = "Personal workspace";
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const backendResponse = await fetch(getBackendUrl("/v1/workspaces"), {
    method: "POST",
    headers: getBackendHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      name: workspaceName,
      owner_email: email,
    }),
  });
  const workspace = backendResponse.ok ? await backendResponse.json() : null;
  const authResponse = await postAuthEndpoint(request, "/sign-up/email", {
    name: String(form.get("name") || ""),
    email: String(form.get("email") || ""),
    password,
    callbackURL: publicAppUrl(request, "/dashboard").toString(),
  });

  if (authResponse.ok) {
    const workspaceId =
      workspace?.id || "new-workspace";

    if (workspace?.id && email) {
      await fetch(getBackendUrl(`/v1/workspaces/${encodeURIComponent(workspace.id)}/bootstrap-auth`), {
        method: "POST",
        headers: getBackendHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email,
        }),
      });
    }

    // If email verification is required, collect the code sent by email.
    // Otherwise (dev mode) send them straight to the dashboard.
    const destination = emailVerificationEnabled
      ? `/verify-email?email=${encodeURIComponent(email)}&sent=1`
      : "/dashboard";

    const response = NextResponse.redirect(publicAppUrl(request, destination));
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
    publicAppUrl(request, `/sign-up?error=${encodeURIComponent(errorCode)}`),
  );
}
