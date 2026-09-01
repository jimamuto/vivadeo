import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode, verifyEmailCode } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const intent = String(form.get("intent") || "verify");

  if (!email) {
    return NextResponse.redirect(publicAppUrl(request, "/sign-in?error=UNKNOWN"));
  }

  if (intent === "resend") {
    await sendVerificationCode(email);
    return NextResponse.redirect(
      publicAppUrl(request, `/verify-email?email=${encodeURIComponent(email)}&sent=1`),
    );
  }

  const verified = await verifyEmailCode(email, String(form.get("code") || ""));
  if (!verified) {
    return NextResponse.redirect(
      publicAppUrl(request, `/verify-email?email=${encodeURIComponent(email)}&error=invalid`),
    );
  }

  return NextResponse.redirect(publicAppUrl(request, "/sign-in?verify=done"));
}
