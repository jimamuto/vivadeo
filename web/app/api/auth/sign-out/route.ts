import { NextRequest, NextResponse } from "next/server";
import { forwardAuthCookies } from "@/lib/auth-cookies";
import { postAuthEndpoint } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST(request: NextRequest) {
  const authResponse = await postAuthEndpoint(request, "/sign-out", {});
  const response = NextResponse.redirect(new URL("/", request.url));
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
