import { NextRequest, NextResponse } from "next/server";
import { forwardAuthCookies } from "@/lib/auth-cookies";
import { getWorkspaceForEmail, postAuthEndpoint } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/sign-in"));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const authResponse = await postAuthEndpoint(request, "/sign-in/email", {
    email,
    password: String(form.get("password") || ""),
    rememberMe: form.get("rememberMe") === "on",
    callbackURL: publicAppUrl(request, "/chat").toString(),
  });

  if (authResponse.ok) {
    const response = NextResponse.redirect(publicAppUrl(request, "/chat"));
    forwardAuthCookies(authResponse, response);
    const requestedWorkspace = request.nextUrl.searchParams.get("workspace") || request.cookies.get("vivadeo_workspace")?.value;
    const workspace =
      requestedWorkspace && requestedWorkspace !== "default-workspace"
        ? requestedWorkspace
        : (await getWorkspaceForEmail(email)) || requestedWorkspace || process.env.VIVADEO_DEFAULT_ORG_ID || "default-workspace";
    response.cookies.set("vivadeo_workspace", workspace, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  }

  // Parse the Better Auth error code and redirect back to the sign-in page
  // with a human-readable error query param instead of showing raw JSON.
  let errorCode = "UNKNOWN";
  try {
    const body = await authResponse.json();
    errorCode = body.code || body.message || "UNKNOWN";
  } catch {
    // ignore parse failures
  }
  return NextResponse.redirect(
    publicAppUrl(request, `/sign-in?error=${encodeURIComponent(errorCode)}`),
  );
}
