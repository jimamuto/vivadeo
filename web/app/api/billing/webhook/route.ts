import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getVivadeoPlan } from "@/lib/plans";
import { planForPrice, requireBillingDatabase, stripe } from "@/lib/billing";

function asDate(seconds: number | null | undefined) { return seconds ? new Date(seconds * 1000) : null; }
function subscriptionId(invoice: any): string | null {
  const value = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  return typeof value === "string" ? value : value?.id || null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const priceId = item?.price.id || null;
  const workspaceFromMetadata = subscription.metadata.vivadeo_workspace_id;
  const sql = requireBillingDatabase();
  try {
    const accounts = workspaceFromMetadata ? [] : await sql<{ organization_id: string }[]>`SELECT organization_id FROM billing_accounts WHERE stripe_customer_id = ${customerId}`;
    const workspace = workspaceFromMetadata || accounts[0]?.organization_id;
    if (!workspace) throw new Error(`No workspace is associated with customer ${customerId}`);
    const plan = subscription.metadata.vivadeo_plan || planForPrice(priceId) || "free";
    const periodStart = (item as any)?.current_period_start || (subscription as any).current_period_start;
    const periodEnd = (item as any)?.current_period_end || (subscription as any).current_period_end;
    await sql`
      INSERT INTO billing_subscriptions (organization_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, updated_at)
      VALUES (${workspace}, ${subscription.id}, ${priceId}, ${plan}, ${subscription.status}, ${asDate(periodStart)}, ${asDate(periodEnd)}, ${subscription.cancel_at_period_end}, NOW())
      ON CONFLICT (organization_id) DO UPDATE SET stripe_subscription_id = EXCLUDED.stripe_subscription_id, stripe_price_id = EXCLUDED.stripe_price_id,
        plan = EXCLUDED.plan, status = EXCLUDED.status, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end, updated_at = NOW()
    `;
    const entitled = ["active", "trialing", "past_due"].includes(subscription.status) ? plan : "free";
    await sql`UPDATE organizations SET plan = ${entitled}, updated_at = NOW() WHERE id = ${workspace}`;
    return { workspace, plan, periodStart: asDate(periodStart), periodEnd: asDate(periodEnd) };
  } finally { await sql.end(); }
}

async function grantInvoiceCredits(invoice: any) {
  const subId = subscriptionId(invoice);
  if (!subId || !stripe) return;
  const subscription = await stripe.subscriptions.retrieve(subId);
  const synced = await syncSubscription(subscription);
  const plan = getVivadeoPlan(synced.plan);
  if (!synced.periodStart || !synced.periodEnd || plan.answerCredits == null || plan.processedSeconds == null) return;
  const sql = requireBillingDatabase();
  try {
    await sql`
      UPDATE credit_grants SET expires_at = NOW()
      WHERE organization_id = ${synced.workspace} AND credit_type IN ('answers', 'processing_seconds')
        AND source IN ('invoice', 'plan_period') AND source_id <> ${invoice.id}
        AND effective_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
    `;
    for (const [type, amount] of [["answers", plan.answerCredits], ["processing_seconds", plan.processedSeconds]] as const) {
      await sql`
        INSERT INTO credit_grants (id, organization_id, credit_type, amount, remaining, source, source_id, effective_at, expires_at)
        VALUES (${randomUUID()}, ${synced.workspace}, ${type}, ${amount}, ${amount}, 'invoice', ${invoice.id}, ${synced.periodStart}, ${synced.periodEnd})
        ON CONFLICT (organization_id, credit_type, source, source_id) DO NOTHING
      `;
    }
  } finally { await sql.end(); }
}

export async function POST(request: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ detail: "Billing webhook is not configured." }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ detail: "Invalid webhook signature." }, { status: 400 });
  }
  const sql = requireBillingDatabase();
  try {
    const inserted = await sql`
      INSERT INTO stripe_events (id, event_type, created, payload)
      VALUES (${event.id}, ${event.type}, ${new Date(event.created * 1000)}, ${sql.json(event as any)})
      ON CONFLICT (id) DO NOTHING RETURNING id
    `;
    if (!inserted.length) return NextResponse.json({ received: true, duplicate: true });
    try {
      if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        await syncSubscription(event.data.object as Stripe.Subscription);
      } else if (event.type === "invoice.paid") {
        await grantInvoiceCredits(event.data.object);
      } else if (event.type === "invoice.payment_failed" || event.type === "invoice.payment_action_required" || event.type === "invoice.finalization_failed") {
        const subId = subscriptionId(event.data.object);
        if (subId) await syncSubscription(await stripe.subscriptions.retrieve(subId));
      }
      await sql`UPDATE stripe_events SET processed_at = NOW() WHERE id = ${event.id}`;
    } catch (error) {
      await sql`UPDATE stripe_events SET error = ${error instanceof Error ? error.message : "Webhook processing failed"} WHERE id = ${event.id}`;
      throw error;
    }
    return NextResponse.json({ received: true });
  } finally { await sql.end(); }
}
