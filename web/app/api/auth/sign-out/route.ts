import { NextRequest, NextResponse } from "next/server";
import { forwardAuthCookies } from "@/lib/auth-cookies";
import { postAuthEndpoint } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/sign-in"));
}

export async function POST(request: NextRequest) {
  const authResponse = await postAuthEndpoint(request, "/sign-out", {});
  const response = NextResponse.redirect(publicAppUrl(request, "/"));
  forwardAuthCookies(authResponse, response);
  // Clear legacy cookie name from an earlier config attempt.
  response.cookies.set("vivadeo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("vivadeo_workspace", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
