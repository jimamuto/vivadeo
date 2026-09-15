"use client";

import { useEffect, useState } from "react";
import { contactEmail } from "@/lib/site";
import { VIVADEO_PLANS, type VivadeoPlanId } from "@/lib/plans";

type Summary = { plan: VivadeoPlanId; subscription: { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null; credits: Record<string, { remaining: number; total: number }>; storageLimitSeconds: number | null; canManage: boolean; billingConfigured: boolean; hasBillingAccount: boolean };
type BillingCacheEntry = { summary: Summary; storageSeconds: number; cachedAt: number };
const allowanceLabel = (remaining = 0, total = 0, unit = "") => `${remaining.toLocaleString()}${unit} remaining of ${total.toLocaleString()}${unit}`;
const billingCache = new Map<string, BillingCacheEntry>();
const billingCacheTtlMs = 30_000;
const cacheKey = (workspace: string) => `vivadeo.billing-cache:${workspace}`;

export function BillingPlans({ workspace }: { workspace: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [storageSeconds, setStorageSeconds] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setStorageSeconds(cached.storageSeconds);
      return;
    }
    sessionStorage.removeItem(key);
    void Promise.all([fetch("/api/billing/summary", { cache: "no-store" }), fetch("/api/proxy/v1/stats", { cache: "no-store" })])
      .then(async ([billingResponse, statsResponse]) => {
        if (!billingResponse.ok) throw new Error("Could not load billing details.");
        const nextSummary = await billingResponse.json() as Summary;
        const nextStorageSeconds = statsResponse.ok ? Number((await statsResponse.json()).total_video_duration_seconds || 0) : 0;
        const entry = { summary: nextSummary, storageSeconds: nextStorageSeconds, cachedAt: Date.now() };
        billingCache.set(workspace, entry);
        sessionStorage.setItem(key, JSON.stringify(entry));
        setSummary(nextSummary);
        setStorageSeconds(nextStorageSeconds);
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

  const answers = summary?.credits.answers;
  const processing = summary?.credits.processing_seconds;
  const renewal = summary?.subscription?.current_period_end ? new Date(summary.subscription.current_period_end).toLocaleDateString() : null;
  const storageLimit = summary?.storageLimitSeconds || 0;

  return <main className="billing-page fade-in">
    <header className="billing-page-header"><div><h1>Plans for every archive</h1><p>Manage your workspace capacity, invoices, and monthly allowances.</p></div><span>{summary ? `${summary.plan[0].toUpperCase()}${summary.plan.slice(1)} plan` : "Loading plan…"}</span></header>
    {notice ? <p className="billing-notice" role="status">{notice}</p> : null}
    {summary ? <section className="billing-overview" aria-label="Current usage">
      <div><span>Vivadeo Auto answers</span><strong>{allowanceLabel(answers?.remaining, answers?.total)}</strong></div>
      <div><span>Video processing</span><strong>{allowanceLabel(Math.floor((processing?.remaining || 0) / 3600), Math.floor((processing?.total || 0) / 3600), "h")}</strong></div>
      <div><span>Video storage</span><strong>{storageLimit ? `${(storageSeconds / 3_600).toFixed(1)}h used of ${(storageLimit / 3_600).toLocaleString()}h` : "Custom allowance"}</strong></div>
      <div><span>Billing status</span><strong>{summary.subscription?.status.replaceAll("_", " ") || "Included"}{renewal ? ` · renews ${renewal}` : ""}</strong></div>
      {summary.canManage && summary.hasBillingAccount ? <button type="button" onClick={() => void openBilling("portal")} disabled={busy !== null}>{busy === "portal" ? "Opening…" : "Manage billing"}</button> : null}
    </section> : null}
    <div className="billing-card-grid">{VIVADEO_PLANS.map((plan) => {
      const current = summary?.plan === plan.id;
      return <article className={`billing-card${plan.featured ? " is-featured" : ""}${current ? " is-current" : ""}`} key={plan.id}>
        <header><div className="billing-card-name"><h2>{plan.name}</h2>{current ? <span>Current</span> : plan.featured ? <span>Recommended</span> : null}</div><p>{plan.description}</p></header>
        <div className="billing-card-price"><strong>{plan.priceLabel}</strong><span>{plan.billingNote}</span></div>
        <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
        {current ? <span className="billing-card-current">Current workspace plan</span> : plan.id === "free" ? <span className="billing-card-current">Included with every workspace</span> : plan.id === "enterprise" ? <a href={`mailto:${contactEmail}?subject=Vivadeo%20Enterprise`}>Contact us</a> : <button type="button" disabled={!summary?.canManage || !summary.billingConfigured || busy !== null} onClick={() => void openBilling(summary?.hasBillingAccount ? "portal" : "checkout", plan.id)}>{busy === plan.id ? "Opening billing…" : summary?.hasBillingAccount ? `Change to ${plan.name}` : `Choose ${plan.name}`}</button>}
      </article>;
    })}</div>
    <p className="billing-page-note">Monthly allowances reset with each successful billing period. Existing archive content is never deleted automatically after a downgrade.</p>
  </main>;
}
