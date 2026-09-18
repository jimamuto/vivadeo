import { NextResponse } from "next/server";
import { postAuthEndpoint } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { code?: string } | null;
  const code = body?.code?.trim() || "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ detail: "Enter the six-digit code from your email." }, { status: 400 });
  }

  const response = await postAuthEndpoint(request, "/delete-user", { token: code, callbackURL: "/sign-in?deleted=1" });
  const payload = await response.json().catch(() => ({ detail: "Could not delete account." }));
  return NextResponse.json(payload, { status: response.status });
}
