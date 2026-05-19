import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/sign-in", request.url));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/sign-in/email", {
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
    const workspace = request.nextUrl.searchParams.get("workspace") || process.env.VIVADEO_DEFAULT_ORG_ID || "default-workspace";
    response.cookies.set("vivadeo_workspace", workspace, {
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
