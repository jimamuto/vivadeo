import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceRoleForRequest } from "@/lib/auth";
import { requireBillingDatabase, stripe } from "@/lib/billing";
import { publicAppUrl } from "@/lib/public-url";

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ detail: "Billing is not configured." }, { status: 503 });
  const workspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const role = await getWorkspaceRoleForRequest(request, workspace);
  if (role !== "owner" && role !== "admin") return NextResponse.json({ detail: "Only workspace owners and admins can manage billing." }, { status: 403 });
  const sql = requireBillingDatabase();
  try {
    const rows = await sql<{ stripe_customer_id: string }[]>`SELECT stripe_customer_id FROM billing_accounts WHERE organization_id = ${workspace}`;
    if (!rows[0]) return NextResponse.json({ detail: "No billing account exists for this workspace." }, { status: 404 });
    const portal = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
      return_url: publicAppUrl(request, "/dashboard/billing").toString(),
    });
    return NextResponse.json({ url: portal.url });
  } finally { await sql.end(); }
}
