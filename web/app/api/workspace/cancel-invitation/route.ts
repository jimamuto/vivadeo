import { NextResponse } from "next/server";
import { getWorkspaceRoleForRequest, postAuthEndpoint } from "@/lib/auth";
import { updateWorkspaceRoleOverrides } from "@/lib/workspace-role-overrides";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    invitationId: string;
    organizationId: string;
    email?: string;
  };
  const workspaceRole = await getWorkspaceRoleForRequest(
    request,
    body.organizationId,
  );
  if (workspaceRole !== "owner" && workspaceRole !== "admin") {
    return NextResponse.json(
      { detail: "Only owners and admins can cancel invitations." },
      { status: 403 },
    );
  }
  if (body.email) {
    await updateWorkspaceRoleOverrides(body.organizationId, (current) => {
      const nextInviteRoles = { ...current.inviteRoles };
      delete nextInviteRoles[body.email!];
      return {
        workspaceRoles: current.workspaceRoles,
        inviteRoles: nextInviteRoles,
      };
    });
  }
  return postAuthEndpoint(request, "/organization/cancel-invitation", {
    invitationId: body.invitationId,
  });
}
