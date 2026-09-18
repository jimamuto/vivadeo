"use client";

import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { siAmericanexpress, siDinersclub, siDiscover, siJcb, siMastercard, siVisa } from "simple-icons";
import { contactEmail } from "@/lib/site";
import { VIVADEO_PLANS, type VivadeoPlanId } from "@/lib/plans";

type Summary = { plan: VivadeoPlanId; subscription: { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null; paymentMethod: { brand: string; last4: string; exp_month: number; exp_year: number; name: string | null } | null; credits: Record<string, { remaining: number; total: number }>; storageLimitSeconds: number | null; canManage: boolean; billingConfigured: boolean; hasBillingAccount: boolean };
type BillingCacheEntry = { summary: Summary; cachedAt: number };
const billingCache = new Map<string, BillingCacheEntry>();
const billingCacheTtlMs = 30_000;
const cacheKey = (workspace: string) => `vivadeo.billing-cache:${workspace}`;

function BillingSkeleton({ plansOnly = false }: { plansOnly?: boolean }) {
  return <div className={`billing-skeleton${plansOnly ? " billing-skeleton-plans" : ""}`} role="status" aria-label="Loading billing details">
    {plansOnly ? <><div className="billing-skeleton-plans-heading"><span /><span /></div><div className="billing-skeleton-plan-grid"><span /><span /><span /></div></> : <>
      <div className="billing-skeleton-current"><span /><span /><span /><span /></div>
      <div className="billing-skeleton-detail-grid"><span /><span /></div>
      <div className="billing-skeleton-history"><span /><span /><span /><span /></div>
    </>}
  </div>;
}

function BillingHeaderSkeleton() {
  return <header className="billing-page-header billing-skeleton-header" aria-hidden="true"><div><span /><span /></div><span /></header>;
}

const paymentBrandIcons = { visa: siVisa, mastercard: siMastercard, amex: siAmericanexpress, discover: siDiscover, jcb: siJcb, diners: siDinersclub } as const;

function PaymentBrandMark({ brand }: { brand: string }) {
  const icon = paymentBrandIcons[brand.toLowerCase() as keyof typeof paymentBrandIcons];
  return icon ? <svg className="billing-payment-brand-logo" viewBox="0 0 24 24" role="img" aria-label={`${brand} card`}><path fill={`#${icon.hex}`} d={icon.path} /></svg> : <span className="billing-payment-brand-fallback" aria-label={`${brand} card`}>CARD</span>;
}

export function BillingPlans({ workspace, plansOnly = false }: { workspace: string; plansOnly?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySort, setHistorySort] = useState("recent");

  useEffect(() => {
    const key = cacheKey(workspace);
    const memoryEntry = billingCache.get(workspace);
    let cached = memoryEntry;
    if (!cached) {
      try { cached = JSON.parse(sessionStorage.getItem(key) || "null") as BillingCacheEntry | null || undefined; } catch { cached = undefined; }
    }
    const returningFromCheckout = new URLSearchParams(window.location.search).has("checkout");
    if (cached && Date.now() - cached.cachedAt < billingCacheTtlMs && !returningFromCheckout) {
      setSummary(cached.summary);
      return;
    }
    sessionStorage.removeItem(key);
    void fetch("/api/billing/summary", { cache: "no-store" })
      .then(async (billingResponse) => {
        if (!billingResponse.ok) throw new Error("Could not load billing details.");
        const nextSummary = await billingResponse.json() as Summary;
        const entry = { summary: nextSummary, cachedAt: Date.now() };
        billingCache.set(workspace, entry);
        sessionStorage.setItem(key, JSON.stringify(entry));
        setSummary(nextSummary);
      }).catch((error) => setNotice(error instanceof Error ? error.message : "Could not load billing details."));
  }, [workspace]);

  async function openBilling(path: "checkout" | "portal", plan?: VivadeoPlanId) {
    setBusy(plan || path); setNotice(null);
    billingCache.delete(workspace);
    sessionStorage.removeItem(cacheKey(workspace));
    try {
      const response = await fetch(`/api/billing/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(plan ? { plan } : {}) });
      const payload = await response.json() as { url?: string; detail?: string };
      if (!response.ok || !payload.url) throw new Error(payload.detail || "Billing could not be opened.");
      window.location.assign(payload.url);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Billing could not be opened."); setBusy(null); }
  }

  const renewal = summary?.subscription?.current_period_end ? new Date(summary.subscription.current_period_end).toLocaleDateString() : null;
  const currentPlan = VIVADEO_PLANS.find((plan) => plan.id === summary?.plan) || VIVADEO_PLANS[0];
  const currentPlanPrice = currentPlan.monthlyPrice === null ? "Custom" : currentPlan.monthlyPrice === 0 ? "Free" : `$${currentPlan.monthlyPrice.toFixed(2)}`;
  const planCards = <div className="billing-card-grid">{VIVADEO_PLANS.map((plan) => {
    const current = summary?.plan === plan.id;
    return <article className={`billing-card${plan.featured ? " is-featured" : ""}${current ? " is-current" : ""}`} key={plan.id}>
      <header><div className="billing-card-name"><h2>{plan.name}</h2>{current ? <span>Current</span> : plan.featured ? <span>Recommended</span> : null}</div><p>{plan.description}</p></header>
      <div className="billing-card-price"><strong>{plan.priceLabel}</strong><span>{plan.billingNote}</span></div>
      <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
      {current ? <span className="billing-card-current">Current workspace plan</span> : plan.id === "free" ? <span className="billing-card-current">Included with every workspace</span> : plan.id === "enterprise" ? <a href={`mailto:${contactEmail}?subject=Vivadeo%20Enterprise`}>Contact us</a> : <button type="button" disabled={!summary?.canManage || !summary.billingConfigured || busy !== null} onClick={() => void openBilling(summary?.hasBillingAccount ? "portal" : "checkout", plan.id)}>{busy === plan.id ? "Opening billing…" : summary?.hasBillingAccount ? `Change to ${plan.name}` : `Choose ${plan.name}`}</button>}
    </article>;
  })}</div>;

  return <main className="billing-page fade-in">
    {plansOnly ? <>
      {summary ? <header className="billing-page-header"><div><h1>Choose a plan</h1><p>Compare workspace capacity and choose what fits your archive.</p></div><a className="billing-help-button" href="/dashboard/billing">← Back to billing</a></header> : <BillingHeaderSkeleton />}
      {notice ? <p className="billing-notice" role="status">{notice}</p> : null}
      {summary ? <section className="billing-plans-section billing-plans-page-section" aria-labelledby="available-plans-heading"><header><div><h2 id="available-plans-heading">Available plans</h2><p>Your current plan is marked below.</p></div></header>{planCards}</section> : <BillingSkeleton plansOnly />}
    </> : <>
    {summary ? <header className="billing-page-header"><div><h1>Plans &amp; Billing</h1><p>Manage your workspace plan, billing details, and monthly allowances.</p></div><a className="billing-help-button" href="/help"><span aria-hidden="true">?</span> Need help?</a></header> : <BillingHeaderSkeleton />}
    {notice ? <p className="billing-notice" role="status">{notice}</p> : null}
    {summary ? <>
      <section className="billing-current-plan" aria-label="Current plan">
        <div className="billing-current-plan-copy"><span className="billing-section-kicker">Current plan</span><h2>{currentPlan.name} Plan</h2><p>{currentPlan.description}</p></div>
        <div className="billing-current-plan-price"><strong>{currentPlanPrice}</strong><span>{currentPlan.monthlyPrice ? "/month" : currentPlan.billingNote}</span></div>
        <div className="billing-current-plan-actions">
          {summary.canManage && summary.hasBillingAccount ? <button type="button" className="billing-button-secondary" onClick={() => void openBilling("portal")} disabled={busy !== null}>{busy === "portal" ? "Opening…" : "Manage billing"}</button> : null}
          {summary.canManage && !summary.hasBillingAccount ? <a className="billing-button-primary" href="/dashboard/billing/plans">Upgrade plan</a> : <a className="billing-button-primary" href="/dashboard/billing/plans">Change plan</a>}
        </div>
      </section>
      <div className="billing-detail-grid">
        <section className="billing-detail-card" aria-labelledby="next-invoice-heading"><h2 id="next-invoice-heading">Next invoice</h2><strong className="billing-detail-amount">{summary.subscription && currentPlan.monthlyPrice ? `$${currentPlan.monthlyPrice.toFixed(2)}` : "No charge"}</strong><dl><div><dt>Plan type</dt><dd>{currentPlan.name} plan</dd></div><div><dt>Next invoice</dt><dd>{renewal || "No upcoming invoice"}</dd></div></dl></section>
        <section className="billing-detail-card billing-payment-method-card" aria-labelledby="payment-method-heading"><h2 id="payment-method-heading">Payment method</h2>{summary.paymentMethod ? <><div className="billing-payment-card-top"><div className="billing-payment-card-number"><span aria-hidden="true">••••</span><strong>{summary.paymentMethod.last4}</strong></div><span className="billing-card-brand"><PaymentBrandMark brand={summary.paymentMethod.brand} /></span></div><dl className="billing-payment-details"><div><dt>Name Card</dt><dd>{summary.paymentMethod.name || "Workspace billing account"}</dd></div><div><dt>Expired Date</dt><dd>{String(summary.paymentMethod.exp_month).padStart(2, "0")}/{String(summary.paymentMethod.exp_year).slice(-2)}</dd></div></dl><div className="billing-payment-actions">{summary.canManage && summary.hasBillingAccount ? <button type="button" className="billing-button-secondary" onClick={() => void openBilling("portal")} disabled={busy !== null}>{busy === "portal" ? "Opening…" : "Change Card"}</button> : null}<button type="button" className="billing-payment-manage-icon" onClick={() => void openBilling("portal")} disabled={!summary.canManage || !summary.hasBillingAccount || busy !== null} aria-label="Manage payment method" title="Manage payment method"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10M9 7V5h6v2M8 10v8M12 10v8M16 10v8M5 7h14M6 7l1 14h10l1-14" /></svg></button></div></> : <p>{summary.hasBillingAccount ? "No payment method is currently available." : "A payment method is only needed when you upgrade to a paid plan."}</p>}</section>
      </div>
      <section className="billing-history" aria-labelledby="billing-history-heading"><header><div><h2 id="billing-history-heading">Billing history</h2><p>Your invoices will appear here after your first paid billing period.</p></div></header><div className="billing-history-toolbar"><div className="billing-history-tabs" role="tablist" aria-label="Billing history filters">{[["all", "View All"], ["active", "Active"], ["archived", "Archived"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={historyFilter === value} className={historyFilter === value ? "is-active" : ""} onClick={() => setHistoryFilter(value)}>{label}</button>)}</div><div className="billing-history-actions"><label className="billing-history-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search invoices</span><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search" /></label><select value={historySort} onChange={(event) => setHistorySort(event.target.value)} aria-label="Sort billing history"><option value="recent">Most Recent</option><option value="oldest">Oldest</option><option value="amount">Amount</option></select><button type="button" className="billing-history-download" disabled aria-label="Download all invoices"><Download size={17} aria-hidden="true" />Download All</button></div></div><div className="billing-history-empty"><span aria-hidden="true">▧</span><strong>{historyQuery ? "No matching invoices" : "No billing history yet"}</strong><p>{historyQuery ? `No invoices match “${historyQuery}”.` : "There are no invoices to display for this workspace."}</p></div></section>
      </> : <BillingSkeleton />}
    </>}
  </main>;
}
