# MoneyGap API™

Programmatic access to queue website analyses and retrieve scores, opportunities, and reports.

API access is included on **all plans**. Monthly call quotas vary by plan — check Developers → Overview for your meter.

## Authentication

Create a key in [Developer console](/dashboard/developers).

| Environment | Prefix |
| --- | --- |
| Development | `mg_test_…` |
| Production | `mg_live_…` |

Send the secret on every request:

```http
Authorization: Bearer mg_test_…
```

or

```http
X-API-Key: mg_test_…
```

Scopes: `analyze`, `read`, `webhooks`. Keys default to all three.

## Base URL

```
https://moneygap-ai.com/api/v1
```

OpenAPI: [`/openapi/moneygap-v1.json`](/openapi/moneygap-v1.json)

## Endpoints

### Queue analysis

```http
POST /api/v1/analyze
```

```bash
curl -X POST https://moneygap-ai.com/api/v1/analyze \
  -H "Authorization: Bearer $MG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"website_url":"https://example.com"}'
```

Body fields:

| Field | Required | Notes |
| --- | --- | --- |
| `website_url` | yes | Absolute URL |
| `industry` | no | Hint for scoring |
| `business_type` | no | Hint for scoring |
| `target_audience` | no | Hint for scoring |

Returns `202` with an analysis id. Poll status until complete.

### Analysis status

```http
GET /api/v1/analyze/{id}/status
```

### Website score

```http
GET /api/v1/websites/{id}/score
```

### Opportunities

```http
GET /api/v1/websites/{id}/opportunities
```

### Report

```http
GET /api/v1/reports/{id}
```

## Webhooks

Register endpoints in Developers → Webhooks. Events:

- `analysis.completed`
- `report.generated`
- `score.updated`
- `opportunity.detected`
- `project.completed`

Payloads are signed with `X-MoneyGap-Signature: sha256=<hmac>` using your endpoint secret. Failed deliveries retry up to three times with backoff.

## Rate limits

- Per-key requests per minute (default 60)
- Monthly `api_call` quota from your plan

## SDKs and CLI

- JavaScript: `@moneygap/sdk` (thin REST client)
- Python: `moneygap` package
- Free diagnostics without a key: `npx moneygap-scan https://example.com`

## Related

- [Programmatic Fix Paths™](/docs/programmatic-fix-paths)
- [Integrations](/docs/integrations)
- [Developer console](/dashboard/developers)
