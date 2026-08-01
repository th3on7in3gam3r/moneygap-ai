# Operations™

## Mission

Operate MoneyGap in production: health, feature flags, analysis failures, crons, billing events, and rollback.

## Phase

Phase 23 Platform 1.0™.

## Health

- `GET /api/health` — `{ ok, db }`
- Always available during `MAINTENANCE_MODE`

## Operations Dashboard™

`/dashboard/system` — flags, analysis failure/completion bands, product metrics, Stripe/cron readiness, recent failures.

## Launch Center™

`/dashboard/launch` — production checklist with live probes + manual acks (`workspace_launch_acks`).

## Background jobs

| Job | Auth |
| --- | --- |
| `POST /api/cron/monitor` | `CRON_SECRET` |
| `POST /api/cron/agency-reports` | `CRON_SECRET` |

## Observability

- Structured logs (`src/lib/observability/logger.ts`)
- Product metrics (`product_metrics_events`)
- Soft retries for transient AI/crawl failures

## Rollback

1. `MAINTENANCE_MODE=1`
2. Optionally `FEATURE_TRUST_ENGINE=0`
3. Redeploy previous release
4. Verify `/api/health` + a known report
5. Clear maintenance

## Related

- [`production-checklist.md`](./production-checklist.md)
- [`platform-1.0.md`](./platform-1.0.md)
- [`security.md`](./security.md)
- [`trust-engine.md`](./trust-engine.md)
