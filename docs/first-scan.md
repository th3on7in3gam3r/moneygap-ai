# First Scan (Onboarding)

## Lightweight discovery (step 2)

`discoverWebsiteSignals` runs in `after()` after `POST /api/onboarding/discover`:

- DNS lookup  
- HTTPS/SSL probe  
- HTML fetch → title/description  
- Heuristic CMS / framework / hosting  

This is **not** the MoneyGap Engine. Results live in `workspace_onboarding.discovery_signals`.

## Full AI scan (step 6)

Before start, the integrations step can call `POST /api/scan/estimate` and let
the user pick a **scan profile** (default **quick** for onboarding speed).

`POST /api/onboarding/start-scan` accepts `{ url?, scanProfile? }` and reuses
the same pipeline as `POST /api/analysis`:

- Validate URL, upsert website, queue `websiteAnalyses` (with `scanProfile`)  
- `runAnalysisPipeline` in `after()`  
- Billing gate + usage recording  

See [scan-profiles.md](./scan-profiles.md) and [scan-jobs.md](./scan-jobs.md).

### Crawl Engine v2

- **Quick:** in-process crawl via moneygap-crawler (+ Firecrawl fallback if empty).  
- **Standard / Deep / Enterprise:** discover-only → `crawl_pages` queue →
  batched `/api/scan/tick` → `runPostCrawlAnalysis`.  

UI: `AnalysisProgress` shows page counters / ETA when present, with pause /
resume for non-quick profiles. `stayOnComplete` keeps onboarding on first results.

## First results

After completion, `POST /api/onboarding/link-report` stores `reportId` and `getFirstResultsSummary` returns:

- MoneyGap Score™  
- Opportunity count  
- Top opportunity + **AI Estimate** range  
- Confidence  
- Primary Fix Path™ (`recommendFixPaths`)  
- Recommended next step  

Then `POST /api/onboarding/complete` seeds the Growth Copilot™ welcome message.
