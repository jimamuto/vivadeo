import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode, verifyEmailCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const intent = String(form.get("intent") || "verify");

  if (!email) {
    return NextResponse.redirect(new URL("/sign-in?error=UNKNOWN", request.url));
  }

  if (intent === "resend") {
    await sendVerificationCode(email);
    return NextResponse.redirect(
      new URL(`/verify-email?email=${encodeURIComponent(email)}&sent=1`, request.url),
    );
  }

  const verified = await verifyEmailCode(email, String(form.get("code") || ""));
  if (!verified) {
    return NextResponse.redirect(
      new URL(`/verify-email?email=${encodeURIComponent(email)}&error=invalid`, request.url),
    );
  }

  return NextResponse.redirect(new URL("/sign-in?verify=done", request.url));
}
