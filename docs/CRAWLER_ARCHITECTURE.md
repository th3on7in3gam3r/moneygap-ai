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
- `scanMeta.crawlDeadlineAt` is a **global** crawl deadline from Scan Profile budgets.
- Stall kicks work for Apify, discover (after 3m), and stale worker (after 3m).
- `failStalePreReportAnalysis` has a true 3h ceiling.
- Discover empty-queue cannot spin forever (fails after 5m).

## Environment

| Variable | Purpose |
|----------|---------|
| `APIFY_API_TOKEN` | Apify primary |
| `FIRECRAWL_API_KEY` | Firecrawl recovery |
| `SCRAPEDO_API_TOKEN` (or `SCRAPE_DO_API_TOKEN`) | Scrape.do rescue |
| `CRAWL_PROVIDER` | `auto` \| `apify` \| `firecrawl` \| `native` |
| `APP_URL` + `CRON_SECRET` | Tick polling |

Missing tokens degrade gracefully (skip that provider).

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
