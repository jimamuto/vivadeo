import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail, getWorkspaceRoleForRequest } from "@/lib/auth";
import { paidPlanPriceIds, requireBillingDatabase, stripe } from "@/lib/billing";
import { publicAppUrl } from "@/lib/public-url";
import type { VivadeoPlanId } from "@/lib/plans";

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ detail: "Billing is not configured." }, { status: 503 });
  const workspace = request.cookies.get("vivadeo_workspace")?.value || "default-workspace";
  const role = await getWorkspaceRoleForRequest(request, workspace);
  if (role !== "owner" && role !== "admin") return NextResponse.json({ detail: "Only workspace owners and admins can change billing." }, { status: 403 });
  const { plan } = await request.json() as { plan?: VivadeoPlanId };
  const price = plan ? paidPlanPriceIds[plan] : undefined;
  if (!plan || !price) return NextResponse.json({ detail: "That plan is not available for checkout." }, { status: 400 });

  const sql = requireBillingDatabase();
  try {
    const accounts = await sql<{ stripe_customer_id: string }[]>`SELECT stripe_customer_id FROM billing_accounts WHERE organization_id = ${workspace}`;
    const active = await sql`SELECT stripe_subscription_id FROM billing_subscriptions WHERE organization_id = ${workspace} AND status IN ('active', 'trialing', 'past_due', 'unpaid')`;
    if (active.length && accounts[0]) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: accounts[0].stripe_customer_id,
        configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
        return_url: publicAppUrl(request, "/dashboard/billing").toString(),
      });
      return NextResponse.json({ url: portal.url });
    }
    let customer = accounts[0]?.stripe_customer_id;
    if (!customer) {
      const email = await getSessionEmail(request);
      const created = await stripe.customers.create({ email: email || undefined, metadata: { vivadeo_workspace_id: workspace } }, { idempotencyKey: `vivadeo-customer-${workspace}` });
      customer = created.id;
      await sql`
        INSERT INTO billing_accounts (organization_id, stripe_customer_id, billing_email, updated_at)
        VALUES (${workspace}, ${customer}, ${email}, NOW())
        ON CONFLICT (organization_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, billing_email = EXCLUDED.billing_email, updated_at = NOW()
      `;
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: workspace,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: publicAppUrl(request, "/dashboard/billing?checkout=success").toString(),
      cancel_url: publicAppUrl(request, "/dashboard/billing?checkout=canceled").toString(),
      subscription_data: { metadata: { vivadeo_workspace_id: workspace, vivadeo_plan: plan } },
      metadata: { vivadeo_workspace_id: workspace, vivadeo_plan: plan },
    }, { idempotencyKey: `vivadeo-checkout-${workspace}-${plan}-${Date.now()}` });
    return NextResponse.json({ url: checkout.url });
  } finally { await sql.end(); }
}
