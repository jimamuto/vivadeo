import { NextRequest, NextResponse } from "next/server";
import { authHandlers } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authResponse = await authHandlers.POST(request.clone());
  if (authResponse.status !== 501) {
    return new NextResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers
    });
  }
  return NextResponse.redirect(new URL("/dashboard?invite=accepted", request.url));
}
