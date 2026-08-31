import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/forgot-password"));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/request-password-reset", {
    email: String(form.get("email") || ""),
    redirectTo: publicAppUrl(request, "/reset-password").toString()
  });
  if (authResponse.ok) {
    return NextResponse.redirect(publicAppUrl(request, "/sign-in?reset=sent"));
  }
  return new NextResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers
  });
}
