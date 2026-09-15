import { NextResponse } from "next/server";
import { getWorkspaceRoleForRequest, postAuthEndpoint } from "@/lib/auth";
import { updateWorkspaceRoleOverrides } from "@/lib/workspace-role-overrides";
import { requireBillingDatabase } from "@/lib/billing";
import { getVivadeoPlan } from "@/lib/plans";

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
  const sql = requireBillingDatabase();
  try {
    const organizations = await sql<{ plan: string }[]>`SELECT plan FROM organizations WHERE id = ${body.organizationId}`;
    const plan = getVivadeoPlan(organizations[0]?.plan);
    if (plan.seats !== null) {
      const rows = await sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM (
          SELECT lower(u.email) AS email FROM member m JOIN "user" u ON u.id = m.user_id WHERE m.organization_id = ${body.organizationId}
          UNION
          SELECT lower(email) FROM invitation WHERE organization_id = ${body.organizationId} AND status = 'pending' AND expires_at > NOW()
        ) seats
      `;
      if (Number(rows[0]?.count || 0) >= plan.seats) {
        return NextResponse.json({ detail: `${plan.name} includes ${plan.seats} workspace seat${plan.seats === 1 ? "" : "s"}. Upgrade before inviting another member.` }, { status: 402 });
      }
    }
  } finally { await sql.end(); }
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
