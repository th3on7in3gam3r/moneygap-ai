# Enterprise Security™

## Phase

Phase 23 Platform 1.0™ — see [`platform-1.0.md`](./platform-1.0.md).

## Authentication & MFA

- Auth is **Clerk**. Optional / enforceable MFA is configured in the Clerk Dashboard (and organization policies).
- Launch Center includes a checklist item to **enforce MFA in Clerk**.
- MoneyGap does **not** ship a custom TOTP server.

## Rate limiting

- Public API keys: per-key limits in `src/lib/platform/auth.ts`.
- Session routes: soft in-memory sliding window via `src/lib/security/rate-limit.ts` (best-effort on single instance).

## Session management

- Clerk sessions; protected routes via `src/proxy.ts`.
- `MAINTENANCE_MODE` returns 503 on dashboard/reports and `/api/v1` (health stays open).

## Audit logs

- Domain logs: Agency (`audit_logs`), Integration Hub, Developer Mode, Team invites.
- Ops peek: `GET /api/ops/audit` (privileged).

## Webhooks

- Outbound MoneyGap webhooks: HMAC `X-MoneyGap-Signature` ([`api-platform.md`](./api-platform.md)).
- Stripe inbound webhooks: `STRIPE_WEBHOOK_SECRET` verification when Stripe is configured.

## Secrets

- Never ship secrets in client bundles.
- `INTEGRATION_ENCRYPTION_KEY` for Integration Hub vault.
- `CRON_SECRET` for Monitor / Agency crons.
- Stripe keys only on server.

## Organization isolation

- All queries scoped by `workspaceId` / membership.
- Client role scoped by `clientId` (Team Workspace™).

## Related

- [`operations.md`](./operations.md)
- [`production-checklist.md`](./production-checklist.md)
- [`permissions.md`](./permissions.md)
