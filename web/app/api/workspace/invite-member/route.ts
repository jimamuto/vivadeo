import { NextResponse } from "next/server";
import { getWorkspaceRoleForRequest, postAuthEndpoint } from "@/lib/auth";
import { updateWorkspaceRoleOverrides } from "@/lib/workspace-role-overrides";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email: string;
    role: string;
    organizationId: string;
  };
  const workspaceRole = await getWorkspaceRoleForRequest(
    request,
    body.organizationId,
  );
  if (workspaceRole !== "owner" && workspaceRole !== "admin") {
    return NextResponse.json(
      { detail: "Only owners and admins can invite members." },
      { status: 403 },
    );
  }
  await updateWorkspaceRoleOverrides(body.organizationId, (current) => ({
    workspaceRoles: current.workspaceRoles,
    inviteRoles: {
      ...current.inviteRoles,
      [body.email]: body.role as "owner" | "admin" | "editor" | "viewer",
    },
  }));
  return postAuthEndpoint(request, "/organization/invite-member", {
    ...body,
    role: body.role === "editor" || body.role === "viewer" ? "member" : body.role,
  });
}
