import { NextRequest, NextResponse } from "next/server";
import { authHandlers } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-url";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(publicAppUrl(request, "/sign-in"));
}

export async function POST(request: NextRequest) {
  const authResponse = await authHandlers.POST(request.clone());
  if (authResponse.status !== 501) {
    return new NextResponse(authResponse.body, {
      status: authResponse.status,
      headers: authResponse.headers
    });
  }
  return NextResponse.redirect(publicAppUrl(request, "/dashboard?invite=accepted"));
}
