import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/reset-password", {
    token: String(form.get("token") || ""),
    newPassword: String(form.get("password") || "")
  });
  if (authResponse.ok) {
    return NextResponse.redirect(new URL("/sign-in?reset=done", request.url));
  }
  return new NextResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers
  });
}
