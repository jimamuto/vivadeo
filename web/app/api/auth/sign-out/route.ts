import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST(request: NextRequest) {
  const authResponse = await postAuthEndpoint(request, "/sign-out", {});
  const response = NextResponse.redirect(new URL("/", request.url));
  authResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append(key, value);
    }
  });
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
