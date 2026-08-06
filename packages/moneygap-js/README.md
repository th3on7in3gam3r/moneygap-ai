# @moneygap/sdk

Thin JavaScript client for [MoneyGap API™](https://moneygap-ai.com/docs/moneygap-api).

## Install

```bash
npm install @moneygap/sdk
```

Or copy `index.ts` from this package into your project until the package is published to npm.

## Usage

```ts
import { MoneyGapClient } from "@moneygap/sdk";

const client = new MoneyGapClient({
  baseUrl: "https://moneygap-ai.com",
  apiKey: process.env.MG_API_KEY!,
});

const queued = await client.analyze("https://example.com");
const status = await client.getAnalysisStatus(queued.id);
```

## Methods

| Method | Endpoint |
| --- | --- |
| `analyze(websiteUrl, options?)` | `POST /api/v1/analyze` (`website_url`) |
| `getAnalysisStatus(id)` | `GET /api/v1/analyze/{id}/status` |
| `getWebsiteScore(id)` | `GET /api/v1/websites/{id}/score` |
| `getWebsiteOpportunities(id)` | `GET /api/v1/websites/{id}/opportunities` |
| `getReport(id)` | `GET /api/v1/reports/{id}` |

OpenAPI: https://moneygap-ai.com/openapi/moneygap-v1.json
