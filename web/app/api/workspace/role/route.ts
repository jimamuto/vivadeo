import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail, getWorkspaceForEmail, getWorkspaceRoleForRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookieWorkspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const email = await getSessionEmail(request);
  const workspace = cookieWorkspace === "default-workspace" && email
    ? (await getWorkspaceForEmail(email)) || cookieWorkspace
    : cookieWorkspace;
  const role = await getWorkspaceRoleForRequest(request, workspace);
  if (!role) {
    return NextResponse.json(
      { detail: "Workspace access is required." },
      { status: 401 },
    );
  }
  const response = NextResponse.json({ role });
  if (workspace !== cookieWorkspace) {
    response.cookies.set("vivadeo_workspace", workspace, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}
