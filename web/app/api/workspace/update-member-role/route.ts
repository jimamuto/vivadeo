import { NextResponse } from "next/server";
import { getWorkspaceRoleForRequest, postAuthEndpoint } from "@/lib/auth";
import { updateWorkspaceRoleOverrides } from "@/lib/workspace-role-overrides";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    memberId: string;
    role: string;
    organizationId: string;
    email?: string;
  };
  const workspaceRole = await getWorkspaceRoleForRequest(
    request,
    body.organizationId,
  );
  if (workspaceRole !== "owner" && workspaceRole !== "admin") {
    return NextResponse.json(
      { detail: "Only owners and admins can update member roles." },
      { status: 403 },
    );
  }
  if (body.email) {
    await updateWorkspaceRoleOverrides(body.organizationId, (current) => ({
      workspaceRoles: {
        ...current.workspaceRoles,
        [body.email!]: body.role as "owner" | "admin" | "editor" | "viewer",
      },
      inviteRoles: current.inviteRoles,
    }));
  }
  return postAuthEndpoint(request, "/organization/update-member-role", {
    ...body,
    role: body.role === "editor" || body.role === "viewer" ? "member" : body.role,
  });
}
