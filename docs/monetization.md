# Monetization Architecture

## Mission

Prepare MoneyGap AI for scalable SaaS monetization—self-serve, agencies, and enterprise. Soft plan gates ship in Phase 8; **Stripe Checkout soft-enables in Phase 23** when `STRIPE_*` keys are configured.

## Plans

| planId | Audience |
| --- | --- |
| `free` | Default new workspaces |
| `starter` | Self-serve |
| `growth` | Growing teams |
| `professional` | Power users |
| `agency` | Agencies (white-label + clients) |
| `enterprise` | Highest caps |

Each plan: monthly/annual prices, feature entitlements, usage limits (analyses, AI, reports, competitors, exports, API, clients, seats, websites).

Legacy IDs (`small_agency`, `growth_agency`, `scale`) resolve via `resolvePlanId()`.

## Feature entitlements

`moneygap_engine` · `ai_advisor` · `action_center` · `monitor` · `competitor_intelligence` · `white_label_reports` · `agency_workspace` · `api_access` · `team_members` · `scheduled_reports`

Gates return friendly upgrade payloads—never hard-block reading existing reports.

## Usage tracking

Events: `website_analysis`, `ai_generation`, `report_created`, `competitor_analysis`, `export`, `api_call`. Aggregated into monthly `usage_periods`.

## Billing models (Stripe-ready)

- `billing_plans` — catalog
- `workspace_subscriptions` — status, interval, Stripe IDs
- `usage_events` / `usage_periods`
- `billing_invoices` — scaffold until Phase 9

### Stripe Sandbox catalog setup

1. Put Sandbox keys in `.env.local`: `STRIPE_SECRET_KEY` (`sk_test_...`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`).
2. Run `npm run stripe:setup` — creates 5 products × monthly/annual prices from [`src/lib/billing/catalog.ts`](../src/lib/billing/catalog.ts), writes `STRIPE_PRICE_*` into `.env.local`, and ensures webhook `https://moneygap-ai.com/api/billing/webhooks` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
3. Mirror the same vars in Vercel Production + Preview.
4. Restart the app and test Checkout at `/dashboard/billing`.

## Upgrade UX

Premium, opportunity-forward copy. Example:

> You found an opportunity. Upgrade to unlock full implementation guidance.

Surfaces: `/dashboard/billing`, Settings summary, inline `UpgradePrompt` / `FeatureLocked`.

## Code map

- `src/lib/billing/` — plans, entitlements, usage, subscription, gate, messages
- `/api/billing/*`
- `/dashboard/billing`
- Agency limits shim via billing catalog

## Monetization

`api_access` on **Professional**, **Agency**, and **Enterprise**. Soft-switch via Billing until Phase 9 Stripe. API calls meter into `usage_periods.api_call`.

## Out of scope (still deferred)

Live Marketplace listing checkout; metered Stripe overages.  
**Phase 23:** Checkout / Portal / webhooks soft-enable when Stripe env is set — see [`platform-1.0.md`](./platform-1.0.md).
