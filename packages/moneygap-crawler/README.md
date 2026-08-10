# MoneyGap Crawler (Crawl Engine v2)

Modular crawl layer for MoneyGap AI. Discovers URLs, smart-renders pages, and adapts results to the existing `ScrapedPage` contract used by `runAnalysisPipeline` / MoneyGap Engine™.

## Pipeline

```
Normalize URL → robots.txt → sitemaps → discover/dedupe → prioritize
  → queue → extract (Cheerio, Playwright if needed) → ScrapedPage[]
```

## Modes

| Mode | Behavior |
|------|----------|
| `quick` | Homepage + about/services/products/pricing/contact |
| `standard` | Sitemap + links up to `maxPages` (product default 15) |
| `deep` | Larger discovery; durable jobs via `crawl_jobs` + Render worker |

## Smart rendering

1. Static `fetch` + Cheerio  
2. Framework detect (Next, React SPA, Vue, Nuxt, Astro, Angular, SvelteKit)  
3. Playwright only when `needsJs` and `PLAYWRIGHT_ENABLED=1`

## Product integration

[`src/lib/analysis/firecrawl.ts`](../../src/lib/analysis/firecrawl.ts) calls `crawlSite()` first, then Firecrawl fallback if empty.

Progress callbacks update analysis stage labels during “Reading pages”.

## CLI / sandbox

`moneygap-diagnostics` uses `loadPageHtml()` for single-page fetch (optional Playwright).

## Config (env)

| Var | Default | Notes |
|-----|---------|-------|
| `CRAWL_MODE_DEFAULT` | `standard` | quick \| standard \| deep |
| `CRAWL_MAX_PAGES` | `15` | Product corpus still capped by Engine |
| `CRAWL_CONCURRENCY` | `3` | Vercel-friendly |
| `CRAWL_BUDGET_MS` | `140000` | Wall clock for in-process crawl |
| `PLAYWRIGHT_ENABLED` | `0` | Set `1` on worker / local with browsers |
| `FIRECRAWL_API_KEY` | — | Optional fallback |

## Deep worker

Render service `moneygap-crawl-worker` runs `npm run worker --prefix packages/moneygap-crawler`.

**Product Engine path:** after the web app discovers URLs into `crawl_pages`, the
worker drains that queue (extract + `website_pages`), then calls
`POST /api/scan/complete` so MoneyGap Engine scoring runs on the web service.

Enable on web: `CRAWL_WORKER_ENABLED=1` + `SCAN_EXECUTION=worker`. Worker needs
the same `DATABASE_URL`, plus `APP_URL` and `CRON_SECRET`.

Enqueue legacy deep-only jobs via `enqueueDeepCrawlJob()` in
`src/lib/analysis/crawl-jobs.ts`.


## Tests

```bash
cd packages/moneygap-crawler && npm test
```
