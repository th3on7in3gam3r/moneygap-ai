# Public API™ (Launch Guide)

## Phase

Phase 23 Platform 1.0™ launch-facing guide. Canonical API design: [`api-platform.md`](./api-platform.md).

## Base

Authenticated requests to `/api/v1/*` with Bearer API key or `X-API-Key`.

## Endpoints (summary)

| Method | Path | Role |
| --- | --- | --- |
| POST | `/api/v1/analyze` | Queue / start analysis |
| GET | `/api/v1/analyze/[id]/status` | Job status |
| GET | `/api/v1/reports/[id]` | Report payload |
| GET | `/api/v1/websites/[id]/score` | Score |
| GET | `/api/v1/websites/[id]/opportunities` | Opportunities |

## Keys & webhooks

Manage in **Developer Hub™** (`/dashboard/developers`): create keys, set rate limits, register webhook endpoints (outbound HMAC).

## SDKs

Thin stubs: `packages/moneygap-js`, `packages/moneygap-python` ([`plugin-sdk.md`](./plugin-sdk.md)).

## Health

`GET /api/health` — unauthenticated liveness (DB probe).

## Related

- [`api-platform.md`](./api-platform.md)
- [`platform-1.0.md`](./platform-1.0.md)
- [`security.md`](./security.md)
