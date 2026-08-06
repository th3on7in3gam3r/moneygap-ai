# MoneyGap API™ & Enterprise Intelligence™

## Mission

Expose MoneyGap Engine™ as a secure intelligence layer so external systems can analyze websites, retrieve scores, opportunities, and reports, and react to growth events—without redesigning product engines.

## Phase numbering

| Phase | Layer |
| --- | --- |
| 8 | Monetization Architecture (complete) |
| 9 | Stripe Checkout / Portal (next) |
| **10** | **MoneyGap API™ & Enterprise Intelligence™** (this doc) |

## Auth

- API keys: `mg_test_…` (development) / `mg_live_…` (production)
- Only the key prefix + SHA-256 hash are stored
- Scopes: `analyze`, `read`, `webhooks`
- Requires billing entitlement `api_access` (included on all plans; monthly call quotas vary by plan)
- Usage: each authenticated v1 call records `api_call`; analyze also records `website_analysis`

## Public API (`/api/v1`)

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| POST | `/analyze` | analyze | Queue website analysis |
| GET | `/analyze/{id}/status` | read | Status |
| GET | `/websites/{id}/score` | read | Score + history |
| GET | `/websites/{id}/opportunities` | read | Opportunities |
| GET | `/reports/{id}` | read | Structured report |

Header: `Authorization: Bearer <api_key>` or `X-API-Key: <api_key>`.

## Webhooks

Endpoints registered per workspace. Events: `analysis.completed`, `report.generated`, `score.updated`, `opportunity.detected`, `project.completed`.

Payload signed with `X-MoneyGap-Signature: sha256=<hmac>`. Soft-fail delivery; never blocks the Engine.

## Related: Integration Hub™ (Phase 14)

Phase 10 is **outbound** (MoneyGap → customer systems via API keys + webhooks).  
Phase 14 Integration Hub™ is **inbound** (customer tools → MoneyGap via OAuth / API keys). See [`integration-hub.md`](./integration-hub.md).

## Dashboard

- `/dashboard/developers` — tabbed console (Overview, API Keys, Webhooks, Logs, Resources)
- `/docs/moneygap-api` — public API reference; OpenAPI at `/openapi/moneygap-v1.json`
- `/dashboard/enterprise` — org overview scaffold (users, websites, reports, scores, usage)
- Linked from Settings (no new sidebar chrome)

## Code map

- `src/lib/platform/` — keys, auth, rate limit, logging, webhooks, enterprise
- `src/app/api/v1/*` — public API
- `src/app/api/developer/*` — key & webhook management (Clerk session)
- Tables: `api_keys`, `api_request_logs`, `webhook_endpoints`, `webhook_deliveries`, `enterprise_settings`

## Security

Workspace isolation on every query. Rate limits per key. Request logging. Hashed key storage. Entitlement + monthly API call limits via monetization catalog.

## Out of scope

- Live SSO IdP wiring (settings scaffold only)
- Metered Stripe billing for API
- Redesigning Engine / Advisor / Monitor / Agency / Billing cores

## Related: Marketplace™ (Phase 22)

Thin JS/Python SDK stubs and Plugin SDK contracts compose this API — see [`marketplace.md`](./marketplace.md), [`plugin-sdk.md`](./plugin-sdk.md).
