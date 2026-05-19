import { NextRequest, NextResponse } from "next/server";
import { authHandlers } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authResponse = await authHandlers.POST(request.clone());
  const response = authResponse.status !== 501
    ? new NextResponse(authResponse.body, { status: authResponse.status, headers: authResponse.headers })
    : NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("vivadeo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
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
