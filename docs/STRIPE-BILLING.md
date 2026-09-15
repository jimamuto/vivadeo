# Vivadeo billing, subscriptions, and credits

This guide describes Vivadeo's complete workspace billing system: Stripe configuration, subscription behavior, plan enforcement, credit accounting, caching, local development, production rollout, and failure recovery.

## Architecture

Billing belongs to a workspace, not an individual user. One Vivadeo workspace maps to one Stripe Customer and at most one active Stripe Subscription.

Stripe is authoritative for money movement, invoices, payment authentication, refunds, and subscription status. PostgreSQL is authoritative for Vivadeo access and usage. A successful browser redirect is never treated as proof of payment; only signed Stripe webhook events change paid entitlements.

The primary implementation areas are:

- `web/app/api/billing/checkout/route.ts`: creates hosted subscription Checkout sessions.
- `web/app/api/billing/portal/route.ts`: creates Customer Portal sessions.
- `web/app/api/billing/webhook/route.ts`: verifies and processes Stripe events.
- `web/app/api/billing/summary/route.ts`: returns workspace plan, subscription, and allowance state.
- `web/lib/billing.ts`: Stripe setup and atomic answer-credit accounting.
- `vivadeo/billing.py`: processing and storage enforcement used by workers.
- `alembic/versions/0025_billing_and_credits.py`: billing and credit schema.
- `web/app/dashboard/billing`: workspace billing UI and short-lived client cache.

## Plan catalogue

| Plan | Monthly price | Processing/month | Stored video | Auto answers/month | Seats | Queue priority |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Free | $0 | 1 hour | 5 hours | 25 | 1 | Standard |
| Starter | $10 | 5 hours | 20 hours | 200 | 1 | Standard |
| Pro | $29 | 20 hours | 100 hours | 1,000 | 1 | Priority |
| Team | $79 | 60 hours | 400 hours | 4,000 | 5 | Priority |
| Business | $199 | 180 hours | 1,500 hours | 15,000 | 10 | Priority |
| Enterprise | Custom | Custom | Custom | Custom | Custom | Priority |

New workspaces are explicitly created with `plan="free"`. Enterprise is contact-led and is not offered through public Checkout.

## Stripe objects

The Stripe sandbox contains one Product and one recurring monthly USD Price for each self-service paid plan. Products and subscriptions carry:

```text
vivadeo_plan=<starter|pro|team|business>
vivadeo_workspace_id=<workspace UUID>
```

The Stripe Customer also carries `vivadeo_workspace_id`. Price IDs are selected on the server from environment variables; the browser cannot submit an arbitrary Price ID or amount.

## Environment variables

Configure the web service with:

```text
STRIPE_SECRET_KEY=sk_... or rk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

Local secrets belong in the ignored root `.env`. Never commit `.env`. `.env.example` documents names only. Both Compose files explicitly forward these values to the web service.

The publishable key is reserved for future embedded payment UI; current payments use Stripe-hosted Checkout and do not require Stripe.js in the browser.

## Initial setup

1. Authenticate the Stripe CLI to the intended sandbox account.
2. Create or reuse the four Products and monthly Prices above.
3. Save their IDs and sandbox credentials in `.env`.
4. Create a Customer Portal configuration containing all four Products and Prices.
5. Enable invoice history and payment-method updates.
6. Enable subscription Price changes.
7. Use `always_invoice` proration for immediate upgrades.
8. Schedule `decreasing_item_amount` changes at period end for downgrades.
9. Configure cancellation with `mode=at_period_end` and no cancellation proration.
10. Apply migrations and recreate the web service so Compose loads the variables.

```powershell
docker compose -f docker-compose.dev.yml exec -T api alembic upgrade head
docker compose -f docker-compose.dev.yml up -d --force-recreate web
docker compose -f docker-compose.dev.yml restart worker
```

## Customer flows

### First paid subscription

1. A workspace owner or admin selects Starter, Pro, Team, or Business.
2. Vivadeo validates workspace membership and billing authority.
3. Vivadeo finds or creates the workspace's Stripe Customer.
4. The server creates a Stripe Checkout Session using its configured Price ID.
5. The browser redirects to Stripe's hosted card-entry page.
6. Stripe may collect additional authentication such as 3DS.
7. Vivadeo waits for signed webhook confirmation before enabling the paid plan.

Editors and viewers may see billing state but cannot start Checkout or manage billing.

### Upgrade

An existing subscriber selecting another plan is sent to the Customer Portal rather than Checkout, preventing duplicate subscriptions. A higher-price change is applied immediately and Stripe invoices the prorated difference. After payment succeeds, webhooks update the plan and replace active monthly allowance grants with the new plan's allowance.

### Downgrade

A lower-price change is scheduled for the end of the current billing period. The workspace retains its current plan and limits until the renewal boundary. When Stripe applies the scheduled change and the next invoice is paid, Vivadeo installs the new plan and its allowances.

Existing videos are not deleted when the new storage limit is lower than current usage. New preparation is blocked until usage returns below the allowance or the workspace upgrades.

### Cancellation

Cancellation is scheduled for period end. The workspace remains paid until the current period expires. After Stripe reports a terminal subscription state, new usage falls back to Free. Existing archive content remains intact.

### Payment failure

- Initial payment failure: paid access is not provisioned.
- Authentication required: Stripe Checkout or Portal collects the required action.
- `past_due`: selected access is temporarily retained as a grace state.
- `unpaid`, `canceled`, or expired initial subscription: new usage falls back to Free.
- The Customer Portal remains the recovery path for updating the payment method and paying invoices.

## Webhook processing

The webhook route verifies the `Stripe-Signature` against the raw request body. Each event is inserted into `stripe_events` before processing; the Stripe event ID is the primary key, so retries cannot apply the same change twice.

Handled events include:

| Event | Action |
| --- | --- |
| `customer.subscription.created` | Store the subscription projection and plan. |
| `customer.subscription.updated` | Reflect status, dates, scheduled cancellation, and applied Price changes. |
| `customer.subscription.deleted` | End paid entitlement and fall back to Free. |
| `invoice.paid` | Confirm entitlement and grant the billing period's credits once. |
| `invoice.payment_failed` | Refresh the current subscription state for payment recovery UI. |
| `invoice.payment_action_required` | Refresh state while customer action is required. |
| `invoice.finalization_failed` | Refresh state without issuing credits. |

Processing errors remain recorded on the event and return a failing response so Stripe can retry. Events can arrive more than once or out of order; handlers use current Stripe subscription state and database uniqueness constraints instead of assuming delivery order.

## Database model

Migration `0025_billing_credits` adds:

- `billing_accounts`: workspace-to-Stripe-Customer mapping.
- `billing_subscriptions`: local subscription projection, Price, status, period, and cancellation state.
- `stripe_events`: durable webhook inbox and idempotency record.
- `credit_grants`: expiring plan or invoice allowances with remaining balances.
- `credit_transactions`: immutable debit/refund ledger keyed by operation ID.

`organizations.plan` is a fast local projection. It does not replace the subscription record. This also permits explicit manual or Enterprise entitlements without manufacturing Stripe subscriptions.

## Credits and enforcement

Credits are resource-specific rather than fungible:

- `answers`: one unit per Vivadeo Auto answer request.
- `processing_seconds`: source duration rounded up to whole seconds.
- Stored video: live sum of video duration, enforced as a quota instead of spent credits.
- Seats: current members plus unexpired pending invitations.

Free and manually assigned plans receive one calendar-month grant. Paid subscriptions receive grants from `invoice.paid`; the invoice ID makes renewal idempotent. A plan-change invoice expires prior active plan grants before issuing the replacement allowance, preventing stacked upgrade balances.

Answer credits are debited atomically before the request reaches the answer service. Failed dispatch or a non-success API response creates an idempotent refund. BYOK requests do not consume Vivadeo Auto credits.

Processing allowance is debited by the worker after authoritative duration detection and before expensive preparation. Failure or cancellation refunds the same job operation exactly once. Repeated delivery of a job cannot double-debit it.

Pro, Team, Business, and Enterprise ingest jobs receive the priority queue value. Free and Starter use standard priority.

## Billing summary cache

The plan catalogue is compiled into the application and is never fetched from Stripe. Subscription and credit summaries come from PostgreSQL.

The Billing page caches summary and usage data per workspace for 30 seconds in memory and `sessionStorage`. This avoids duplicate requests during quick navigation without making browser storage authoritative. The cache is discarded before opening Checkout or the Portal and ignored on Checkout return, ensuring payment changes are refreshed promptly.

## Local development and testing

Start the signed webhook forwarder:

```powershell
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy that listener's `whsec_...` value into `.env` and recreate the web container. The CLI signing secret is for local forwarding; configure a persistent HTTPS webhook endpoint and its own signing secret for production.

Use Stripe test cards only in sandbox mode. Complete an actual Checkout to test metadata and workspace association. Useful webhook fixtures include:

```powershell
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

Generic CLI fixtures may not contain Vivadeo workspace metadata, so a real test Checkout is the most reliable end-to-end test.

Run repository verification:

```powershell
uv run pytest tests/test_billing.py tests/test_api.py -q
Set-Location web
npm.cmd run typecheck
npm.cmd run build
```

## Production rollout

1. Recreate Products, Prices, and the Portal configuration in live mode; test and live IDs are different.
2. Use a permanent, least-privilege live secret rather than a temporary CLI key.
3. Set the public application URL to the production HTTPS origin.
4. Register `https://<host>/api/billing/webhook` in Stripe Workbench.
5. Subscribe only to the handled events listed above.
6. Store the production endpoint signing secret in the deployment secret store.
7. Apply the database migration before enabling paid-plan buttons.
8. Confirm webhook delivery, Checkout, 3DS, invoice recovery, upgrade, downgrade, cancellation, and duplicate-event behavior.
9. Enable Stripe tax collection only after tax registrations and customer-location requirements are decided.
10. Monitor unprocessed or errored rows in `stripe_events` and reconcile local subscriptions against Stripe regularly.

## Operational troubleshooting

### Paid plan buttons are disabled

Confirm the secret key and all four Price variables exist inside the running web container. Recreate, rather than merely restart, the container after changing Compose environment values.

### The app says to manage an existing subscription

Refresh the page. Current code routes plan-change buttons and the defensive Checkout path to the Portal whenever an existing subscription is present.

### Portal opens but plan changes are missing

Verify `STRIPE_PORTAL_CONFIGURATION_ID` points to an active configuration with `subscription_update.enabled=true`, `default_allowed_updates=[price]`, and all four Products/Prices.

### Checkout returns but the plan does not change

Check that the local listener or production webhook endpoint is active, the signing secret matches that endpoint, and the relevant event row has `processed_at` populated with no error.

### Credits appear stale

Billing UI values can remain cached for at most 30 seconds. Checkout/Portal navigation invalidates the cache. Inspect active `credit_grants` and immutable `credit_transactions` when the discrepancy persists.

### A workspace exceeds a downgraded limit

Vivadeo preserves existing content. New storage or processing operations are rejected until the workspace deletes content, waits for allowance renewal where applicable, or upgrades.

## Current development configuration

The local environment is configured against a Stripe sandbox. The authenticated CLI key is temporary and must be replaced before its expiry. No sandbox secret, webhook secret, or Price ID is committed to Git.
