import { randomUUID } from "node:crypto";
import postgres from "postgres";
import Stripe from "stripe";
import { getVivadeoPlan, type VivadeoPlanId } from "@/lib/plans";

const rawDatabaseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.replace(/^postgresql\+psycopg:\/\//, "postgres://").replace(/^postgresql\+psycopg2:\/\//, "postgres://");

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-08-26.dahlia" })
  : null;

export const paidPlanPriceIds: Partial<Record<VivadeoPlanId, string>> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

export function requireBillingDatabase() {
  if (!databaseUrl) throw new Error("Billing database is not configured");
  return postgres(databaseUrl, { max: 1 });
}

export async function ensureAllowanceGrant(organizationId: string, planId: string) {
  const plan = getVivadeoPlan(planId);
  if (plan.id === "enterprise" || plan.answerCredits == null || plan.processedSeconds == null) return;
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const sourceId = `${plan.id}:${periodStart.toISOString().slice(0, 7)}`;
  const sql = requireBillingDatabase();
  try {
    for (const [creditType, amount] of [["answers", plan.answerCredits], ["processing_seconds", plan.processedSeconds]] as const) {
      await sql`
        INSERT INTO credit_grants (id, organization_id, credit_type, amount, remaining, source, source_id, effective_at, expires_at)
        SELECT ${randomUUID()}, ${organizationId}, ${creditType}, ${amount}, ${amount}, 'plan_period', ${sourceId}, ${periodStart}, ${periodEnd}
        WHERE NOT EXISTS (
          SELECT 1 FROM credit_grants WHERE organization_id = ${organizationId} AND credit_type = ${creditType}
            AND effective_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
        )
        ON CONFLICT (organization_id, credit_type, source, source_id) DO NOTHING
      `;
    }
  } finally { await sql.end(); }
}

export async function ensureWorkspaceAllowance(organizationId: string) {
  const sql = requireBillingDatabase();
  try {
    const rows = await sql<{ plan: string }[]>`SELECT plan FROM organizations WHERE id = ${organizationId}`;
    const subscriptions = await sql`SELECT 1 FROM billing_subscriptions WHERE organization_id = ${organizationId} LIMIT 1`;
    if (!subscriptions.length) await ensureAllowanceGrant(organizationId, rows[0]?.plan || "free");
  } finally { await sql.end(); }
}

export async function consumeCredit(organizationId: string, creditType: string, amount: number, operationId: string) {
  const sql = requireBillingDatabase();
  try {
    return await sql.begin(async (tx) => {
      const duplicate = await tx`SELECT id FROM credit_transactions WHERE organization_id = ${organizationId} AND operation_id = ${operationId} AND kind = 'debit'`;
      if (duplicate.length) return true;
      const grants = await tx<{ id: string; remaining: number }[]>`
        SELECT id, remaining FROM credit_grants
        WHERE organization_id = ${organizationId} AND credit_type = ${creditType} AND remaining >= ${amount}
          AND effective_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY expires_at ASC NULLS LAST, created_at ASC FOR UPDATE
      `;
      const grant = grants[0];
      if (!grant) return false;
      await tx`UPDATE credit_grants SET remaining = remaining - ${amount} WHERE id = ${grant.id}`;
      await tx`
        INSERT INTO credit_transactions (id, organization_id, grant_id, credit_type, amount, kind, operation_id, metadata)
        VALUES (${randomUUID()}, ${organizationId}, ${grant.id}, ${creditType}, ${-amount}, 'debit', ${operationId}, ${tx.json({})})
      `;
      return true;
    });
  } finally { await sql.end(); }
}

export async function refundCredit(organizationId: string, operationId: string) {
  const sql = requireBillingDatabase();
  try {
    await sql.begin(async (tx) => {
      const rows = await tx<{ grant_id: string; credit_type: string; amount: number }[]>`
        SELECT grant_id, credit_type, amount FROM credit_transactions
        WHERE organization_id = ${organizationId} AND operation_id = ${operationId} AND kind = 'debit' FOR UPDATE
      `;
      const debit = rows[0];
      if (!debit) return;
      const existing = await tx`SELECT id FROM credit_transactions WHERE organization_id = ${organizationId} AND operation_id = ${operationId} AND kind = 'refund'`;
      if (existing.length) return;
      const amount = Math.abs(Number(debit.amount));
      await tx`UPDATE credit_grants SET remaining = remaining + ${amount} WHERE id = ${debit.grant_id}`;
      await tx`
        INSERT INTO credit_transactions (id, organization_id, grant_id, credit_type, amount, kind, operation_id, metadata)
        VALUES (${randomUUID()}, ${organizationId}, ${debit.grant_id}, ${debit.credit_type}, ${amount}, 'refund', ${operationId}, ${tx.json({})})
      `;
    });
  } finally { await sql.end(); }
}

export function planForPrice(priceId: string | null | undefined): VivadeoPlanId | null {
  return (Object.entries(paidPlanPriceIds).find(([, value]) => value === priceId)?.[0] as VivadeoPlanId | undefined) || null;
}
