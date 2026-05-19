import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const workspace = String(form.get("workspace") || "default-workspace");
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("vivadeo_workspace", workspace, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
