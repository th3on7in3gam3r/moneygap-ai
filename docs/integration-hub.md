# MoneyGap Integration Hub™

## Mission

MoneyGap AI should understand businesses beyond their public website by securely connecting to the tools they already use—analytics, CRM, email, CMS, hosting, payments, and automation.

## Phase

**Phase 14 — MoneyGap Integration Hub™**  
(Brief label “Phase 12 (Integration Hub)”. Growth OS remains Phase 12; Trust remains Phase 11; Knowledge Graph remains Phase 13.)

## Principles

- Soft-fail: Hub failures never block Phase 2 reports or Engine runs.
- Additive: enhance Settings / dashboard surface; no sidebar redesign.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™.
- Distinct from Phase 10 **outbound** MoneyGap API webhooks (`api-platform.md`).
- Distinct from Phase 9 MoneyGap **billing** Stripe (`billing/`); Hub Stripe is the customer’s own Stripe account.
- Provider catalog is complete; live vendor API sync ships incrementally (reference connectors first).

## Architecture

```
Dashboard → Integrations API → Connector Registry
                ↓                      ↓
        Encrypted Credential Vault   fetchRaw + normalize
                ↓                      ↓
             Audit logs          Connection snapshot
                                       ↓
                            Integration Health + Connection Map
```

## Connector contract

Each connector supports:

| Capability | Role |
| --- | --- |
| Authentication | OAuth2 and/or API key |
| Permissions / scopes | Declared per provider |
| Data retrieval | `fetchRaw` |
| Normalization | Shared `NormalizedIntegrationData` |
| Error handling | Connection `error` status + `lastError` |
| Disconnect | Clear credentials + audit |

## Provider catalog

Categories: Analytics, CRM, Email, CMS, Developer, Hosting, Payments, Automation.

All brief providers are seeded (Google Analytics, HubSpot, Mailchimp, Shopify, GitHub, Vercel, Stripe, Zapier, …). Reference live patterns: **GitHub** (OAuth2), **Stripe** (API key), **HubSpot** (OAuth2 Legacy App via `HUBSPOT_INTEGRATION_CLIENT_ID` / `SECRET`; Private App `HUBSPOT_ACCESS_TOKEN` is a local fallback). Others use stub connectors until credentials/env are configured.

## Security

- OAuth authorization code + signed short-lived `state`
- Credentials encrypted at rest (AES-256-GCM via `INTEGRATION_ENCRYPTION_KEY`)
- Raw secrets never returned to the client
- Permission scopes stored on the connection
- Audit log for connect / disconnect / sync / errors
- Mutating routes: workspace owner/admin

## Connection Map

Category-grouped view of connected, missing, error, and pending systems for the workspace.

## Integration Health

Score 0–100 from:

- Connected systems count
- Data freshness (`lastSyncAt`)
- Errors
- Missing critical categories (analytics, CRM, email, payments)

## Report / Engine

Hub data is **not** injected into MoneyGap Engine yet (future expansion).

## UX

Hub surfaces a persistent **Why connect** band and a one-time acknowledgement dialog before the first Connect (`mg_integrations_ack_v1`). OAuth return with `?connected=` shows a success note. Copy stays honest: stack context + GitHub Developer Mode today; Engine enrichment incremental; no score rewrite.

## Code map

- `src/lib/integrations/` — crypto, catalog, registry, connectors, connections, health, audit
- `src/app/api/integrations/` — list, connect, disconnect, sync, OAuth callback, audit
- `src/app/dashboard/integrations/` — Hub UI
- Tables: `integration_providers`, `integration_connections`, `integration_credentials`, `integration_audit_logs`

## Env

| Variable | Purpose |
| --- | --- |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte key, base64-encoded |
| `GITHUB_INTEGRATION_CLIENT_ID` / `SECRET` | Optional GitHub OAuth app |
| `APP_URL` | OAuth callback base URL |

## Related

**Developer Mode™ (Phase 15)** uses Hub GitHub OAuth credentials for repository intelligence and authorized draft PRs. See `docs/developer-mode.md`.

## Future expansion

Per-vendor live sync; token rotation jobs; Engine `kgContext` enrichment from connected systems; Benchmark Intelligence as a separate phase. Out of scope for 14: Neo4j, OI rewrite, Zapier app publishing, sidebar redesign.
