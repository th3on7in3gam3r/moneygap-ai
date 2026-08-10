# MoneyGap Crawl Orchestrator™

Reliable page acquisition for the MoneyGap Engine. Optimize for **reliability** and **useful business evidence**, not raw page count.

## Provider roles

| Provider | Role |
|----------|------|
| **Apify** (`website-content-crawler`) | PRIMARY full-site crawl (async) |
| **Firecrawl** | Fallback / targeted recovery of failed URLs |
| **Scrape.do** | Rescue fetcher for hard URLs (403 / anti-bot) |
| **MoneyGap Native** | Emergency durable crawl when corpus is empty |

## Flow

```
START → validate URL (SSRF) → connectivity
  → Apify async run (poll via /api/scan/tick)
  → Normalize into SuccessfulPageMap
  → Firecrawl recover failed/important URLs only
  → Scrape.do rescue remaining hard URLs
  → If still below minimum → Native discover/ticks
  → Quality pick + dedupe
  → website_pages → runPostCrawlAnalysis
```

**Never discard successful pages** when a later provider runs.

## Partial completion

If enough useful pages exist but some failed:

- `status: "completed"`
- `scanMeta.partial: true`
- Engine still runs

Only fail when the corpus is below the minimum viable threshold.

## Timeouts & never-stuck

- Every provider HTTP call uses AbortController / deadline helpers.
- **Active deadline (A):** `scanMeta.crawlDeadlineAt` from Scan Profile budgets (quick ~4m / standard ~10m / deep ~20m / enterprise ~45m). Enforced on Apify polls and native/worker ticks — do **not** wait for the orphan ceiling.
- **Stale / orphan unlock (B):** `failStalePreReportAnalysis` soft floor ~30m (plus ETA padding), hard cap **3h** — UI unlock for abandoned jobs only, not the active scan SLA.
- Stall kicks: Apify/ticks ~90s, discover after 3m, worker after 3m (`WORKER_STALL_MS`). Worker unlock still uses stale-fail (~30m), not 3h.
- Discover empty-queue cannot spin forever (fails after 5m).

## Production execution path

Long crawls do **not** require the original Vercel request to stay alive. Persistence is DB + `after()` / ticks / worker:

1. API finishes `runAnalysisPipeline` → `startCrawlAcquisition`.
2. **Apify:** persist `providerRunId` + `crawlDeadlineAt` → `scheduleScanTick` → `/api/scan/tick` polls → pages → Engine.
3. **Native + worker** (`CRAWL_WORKER_ENABLED=1` / `SCAN_EXECUTION=worker`): discover enqueues `crawl_pages` (`queued`), analysis `execution=worker` → Render Background Worker drains → `POST /api/scan/complete`.
4. **Native + ticks:** same queue drained by self-scheduled `/api/scan/tick`.

Tick/complete HTTP uses `APP_URL` (then `NEXT_PUBLIC_APP_URL`) + `CRON_SECRET` (`x-cron-secret` or Bearer). Missing either sets `tickScheduleError` (no silent “success”). Worker notify uses the same origin preference — never `RENDER_EXTERNAL_URL` for web callbacks.

## Environment

| Variable | Purpose |
|----------|---------|
| `APIFY_API_TOKEN` (alias `APIFY_TOKEN`) | Apify primary |
| `FIRECRAWL_API_KEY` | Firecrawl recovery |
| `SCRAPEDO_API_TOKEN` (or `SCRAPE_DO_API_TOKEN`) | Scrape.do rescue |
| `CRAWL_PROVIDER` | `auto` \| `apify` \| `firecrawl` \| `native` |
| `APP_URL` + `CRON_SECRET` | Tick / complete self-schedule |
| `CRAWL_WORKER_ENABLED` / `SCAN_EXECUTION` | Prefer Render worker for native drain |

Missing tokens degrade gracefully (skip that provider). If only `APIFY_TOKEN` is set historically, the alias is accepted — prefer renaming to `APIFY_API_TOKEN` in Vercel.

## Profiles

Source of truth: [`src/lib/scan/profiles.ts`](../src/lib/scan/profiles.ts)

| Profile | max pages | global deadline (approx) |
|---------|-----------|--------------------------|
| quick | 25 | 4 min |
| standard | 100 | 10 min |
| deep | 500 | 20 min |
| enterprise | 5000 | 45 min |

## Code map

- Orchestrator: [`src/lib/scan/crawlers/orchestrator.ts`](../src/lib/scan/crawlers/orchestrator.ts)
- Merge/quality: `merge.ts`, `quality.ts`, `content-validate.ts`
- Providers: `apify.ts`, `firecrawl.ts`, `scrapedo.ts`, `native.ts`
- Wire-up: `acquisition.ts` ← `runAnalysisPipeline`

## Related docs

- [Root cause audit](./CRAWLER_ROOT_CAUSE_AUDIT.md)
- [Troubleshooting](./CRAWLER_TROUBLESHOOTING.md)
- [Apify provider notes](./APIFY_CRAWLER_PROVIDER.md)
