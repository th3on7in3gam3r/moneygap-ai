# Configuration guide

## Environment variables

| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `CRAWL_MODE_DEFAULT` | App | `standard` | quick / standard / deep for product scans |
| `CRAWL_MAX_PAGES` | App | `15` | Max pages scraped into corpus |
| `CRAWL_CONCURRENCY` | App / Worker | `3` / `10` | Parallel page extractors |
| `CRAWL_BUDGET_MS` | App | `140000` | In-process wall clock |
| `CRAWL_DELAY_MS` | App | `0` | Extra politeness delay (robots delay also applied) |
| `PLAYWRIGHT_ENABLED` | App / Worker | `0` | Enable JS rendering when needed |
| `FIRECRAWL_API_KEY` | App | — | Fallback when local crawl is empty |
| `OPENAI_API_KEY` | App | required | Intelligence + Engine |
| `DATABASE_URL` | Worker | required | Deep job queue |
| `CRAWL_WORKER_POLL_MS` | Worker | `5000` | Poll interval |
| `CRAWL_MAX_RUNTIME_MS` | Worker | `900000` | Deep crawl budget |

## Recommended presets

**Small sites (Vercel):** concurrency 3–5, maxPages 12–15, Playwright off  

**Medium:** concurrency 8–10, maxPages 25, Playwright on worker only  

**Large / Deep:** enqueue `crawl_jobs`, worker concurrency 10–25, Playwright on  

## Database

After deploy, push schema so `crawl_jobs` / `crawl_pages` exist:

```bash
npm run db:push
```

## Firecrawl

Still used for:

1. Empty local crawl fallback  
2. Competitive intelligence crawl (unchanged)

You can omit `FIRECRAWL_API_KEY` if local crawl succeeds for your target sites; competitive features will soft-fail without it.
