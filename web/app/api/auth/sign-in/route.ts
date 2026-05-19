import { NextRequest, NextResponse } from "next/server";
import { authHandlers } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authResponse = await authHandlers.POST(request.clone());
  if (authResponse.status !== 501) {
    const response = new NextResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers
    });
    const workspace = request.nextUrl.searchParams.get("workspace") || process.env.SENTRYSEARCH_DEFAULT_ORG_ID || "default-workspace";
    response.cookies.set("vivadeo_workspace", workspace, {
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
  const workspace = String(process.env.SENTRYSEARCH_DEFAULT_ORG_ID || "default-workspace");
  response.cookies.set("vivadeo_workspace", workspace, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
