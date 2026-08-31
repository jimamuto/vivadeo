import { NextRequest, NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/reset-password"));
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authResponse = await postAuthEndpoint(request, "/reset-password", {
    token: String(form.get("token") || ""),
    newPassword: String(form.get("password") || ""),
  });
  if (authResponse.ok) {
    return NextResponse.redirect(publicAppUrl(request, "/sign-in?reset=done"));
  }
  let errorCode = "UNKNOWN";
  try {
    const body = await authResponse.json();
    errorCode = body.code || body.message || "UNKNOWN";
  } catch {
    /* ignore */
  }
  return NextResponse.redirect(
    publicAppUrl(request, `/reset-password?error=${encodeURIComponent(errorCode)}`),
  );
}
