# MoneyGap Platform 1.0™

## Mission

Prepare MoneyGap AI for public launch: production-ready, secure, reliable, and well documented—by polishing and strengthening existing capabilities rather than adding major new product lines.

## Phase

**Phase 23 — MoneyGap Platform 1.0™ (Launch Readiness)**  
(Brief “Phase 20 Platform 1.0”; Marketplace is Phase 22.)

## Principles

- Soft-fail behind `FEATURE_PLATFORM_1_0` (default on unless `=0`).
- Compose Trust Engine™, production checklist, billing soft-gates, Public API™, system dashboard, observability, audit logs.
- Enhance shell only (Launch / Success / Docs deep routes); no sidebar redesign.
- No Score / Opportunity Index rewrite; never auto-publish.
- Stripe Checkout soft-enables when keys are configured; otherwise soft plan gates remain.

## Modules

| Module | Surface |
| --- | --- |
| Production Readiness™ | Launch Center checklist + probes |
| Enterprise Security™ | MFA guidance, rate limits, isolation, webhooks |
| Performance Engine™ | Retries, soft timeouts, loading states |
| Reliability & Monitoring™ | Health + Operations Dashboard |
| Billing & Subscription™ | Soft plans + Stripe when configured |
| Customer Success Center™ | `/dashboard/success` |
| Documentation Center™ | `/dashboard/docs` |
| Public API™ | Existing `/api/v1` + Developer Hub |
| Platform Analytics™ | Product metrics in Ops / analytics |
| Launch Center™ | `/dashboard/launch` |
| Operations Dashboard™ | `/dashboard/system` |

## Code map

- `src/lib/launch/` — flag, readiness, acks
- `src/lib/security/rate-limit.ts`
- `src/lib/billing/stripe.ts`
- `/api/launch/*`, `/api/billing/checkout|portal|webhooks`, `/api/success/*`, `/api/ops/audit`

## Related

- [`security.md`](./security.md)
- [`public-api.md`](./public-api.md)
- [`customer-success.md`](./customer-success.md)
- [`operations.md`](./operations.md)
- [`production-checklist.md`](./production-checklist.md)
- [`monetization.md`](./monetization.md)
- [`trust-engine.md`](./trust-engine.md)

## Out of scope

Custom MFA server; SSO IdP wiring; full APM vendors; Marketplace paid checkout; Engine rewrites.
