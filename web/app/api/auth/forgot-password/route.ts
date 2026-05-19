import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/request-password-reset", {
    email: String(form.get("email") || ""),
    redirectTo: new URL("/reset-password", request.url).toString()
  });
  if (authResponse.ok) {
    return NextResponse.redirect(new URL("/sign-in?reset=sent", request.url));
  }
  return new NextResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers
  });
}
