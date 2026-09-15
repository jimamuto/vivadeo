import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceRoleForRequest } from "@/lib/auth";
import { ensureAllowanceGrant, paidPlanPriceIds, requireBillingDatabase } from "@/lib/billing";
import { getVivadeoPlan } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const workspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const role = await getWorkspaceRoleForRequest(request, workspace);
  if (!role) return NextResponse.json({ detail: "Workspace access is required." }, { status: 401 });
  const sql = requireBillingDatabase();
  try {
    const organizations = await sql<{ plan: string }[]>`SELECT plan FROM organizations WHERE id = ${workspace}`;
    const plan = getVivadeoPlan(organizations[0]?.plan);
    const subscriptions = await sql`SELECT status, current_period_start, current_period_end, cancel_at_period_end FROM billing_subscriptions WHERE organization_id = ${workspace}`;
    if (!subscriptions.length) await ensureAllowanceGrant(workspace, plan.id);
    const credits = await sql<{ credit_type: string; remaining: number; total: number }[]>`
      SELECT credit_type, COALESCE(SUM(remaining), 0)::bigint AS remaining, COALESCE(SUM(amount), 0)::bigint AS total
      FROM credit_grants WHERE organization_id = ${workspace} AND effective_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY credit_type
    `;
    const creditMap = Object.fromEntries(credits.map((row) => [row.credit_type, { remaining: Number(row.remaining), total: Number(row.total) }]));
    return NextResponse.json({
      plan: plan.id,
      subscription: subscriptions[0] || null,
      credits: creditMap,
      storageLimitSeconds: plan.storageSeconds,
      seats: plan.seats,
      canManage: role === "owner" || role === "admin",
      billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY && Object.values(paidPlanPriceIds).some(Boolean)),
      hasBillingAccount: subscriptions.length > 0,
    });
  } finally { await sql.end(); }
}
