# Crawl Engine Fault Tolerance

## Root cause of “Reading pages (sitemap)” freezes

Onboarding / **quick** scans used to bypass the durable tick queue and run
in-process `crawlWebsite()`. Progress sat at **~18%** with stage
`Reading pages (sitemap)` while `discoverSitemapUrls` walked maps
**sequentially** (no mid-loop heartbeats). Serverless often timed out before
any page was read → no report.

### Amplifiers

| Bug | Why it hung |
|-----|-------------|
| Quick in-process crawl | One long `after()` with silent sitemap loop |
| Uncapped robots `Crawl-delay` | Multi-minute sleeps between fetches |
| Thin sitemap seeds | Missed WP `post-sitemap.xml` / `.xml.gz` |
| Missing `CRON_SECRET` / `APP_URL` | Later ticks silently stopped (standard+) |
| Orphan `processing` rows | Empty claim left queue undrained |

This was **not** an AI/Money Gap Engine hang — post-crawl never started.

## Current architecture (all product profiles)

```
POST /api/analysis | onboarding/start-scan (+ scanProfile)
  → after(runAnalysisPipeline)
     → runIncrementalDiscover (quick / standard / deep / enterprise)
        → robots + budgeted sitemap discover + homepage BFS
        → enqueue crawl_pages (cap by profile maxPages)
        → processScanTick loop (~50s) then scheduleScanTick
     → POST /api/scan/tick (Bearer CRON_SECRET)
        → reclaim stale processing → concurrent extract
        → runPostCrawlAnalysis when queue drained
```

MoneyGap analysis modules are unchanged at `runPostCrawlAnalysis`.

### Caps

| Profile | maxPages | Notes |
|---------|----------|--------|
| Quick | **25** | Same incremental path as standard |
| Standard | **100** | |
| Deep | **500** | |
| Enterprise | **5_000** | Soft enqueue ceiling `HARD_PAGE_CEILING = 5000` |

### Discover never silent / never unbounded

- Sitemap wall budget **~25s**; returns partial URLs and continues
- Progress hooks every map fetch → UI stages move (`Looking for sitemap…`,
  `Found N URLs…`, `Reading page k of N…`)
- Seeds include WP/common paths + robots hints; gzip soft-try; invalid XML / 404
  never abort the scan
- Homepage link discovery always follows empty/partial sitemap
- Robots crawl-delay clamped to **≤ 2s**

### Scan stages (`scanMeta.scanStage`)

`connecting` → `robots` → `sitemap` → `discovery` → `queue` → `crawling` →
`analyzing` / `extract_content` → … → complete  
Failed / paused are exits. UI surfaces `tickScheduleError` when ticks cannot
schedule.

## Fixes shipped (queue / ticks)

### Queue

- `reclaimStaleProcessing` (20s TTL) → `retry` or `failed` at 3 attempts
- Attempt-capped `markFailed`
- State-guarded atomic UPDATE…RETURNING claim (Neon HTTP–safe)

### Tick scheduling

- Fire-and-forget via Next `after()` + `AbortSignal.timeout(5000)`
- In-tick wall budget ~45s; defer remaining pages to next tick
- Surfaces `scanMeta.tickScheduleError` when env missing or HTTP fails
- **In-process fallback** when HTTP self-schedule is unavailable (still logs loudly)
- Discover `finally` always schedules at least one follow-up tick if unfinished

### Concurrent reads + progress

- Concurrency **5** with `Promise.allSettled`
- Per-page progress / counters / `currentUrl`
- `withTimeout(extract, 15s)` around each page
- Discover progress floor nudges on every sitemap heartbeat

### Watchdog + logging

- 20s no-progress watchdog aborts active extracts and requeues
- Structured logs: `[Scanner]`, `[SCAN]`, `[CRAWLER]`, `[FETCH]`, `[QUEUE]`,
  `[PROGRESS]`, `[WATCHDOG]`

### Normalization

- Strip hash, tracking params, trailing slash; force https

## Files modified

- `packages/moneygap-crawler/src/sitemaps/index.ts`
- `packages/moneygap-crawler/src/crawl.ts` / `discovery-only.ts`
- `src/lib/scan/batch.ts`
- `src/lib/scan/continue.ts`
- `src/lib/scan/profiles.ts`
- `src/lib/scan/providers/defaults.ts`
- `src/lib/analysis/pipeline.ts`
- `src/components/analysis/analysis-progress.tsx`
- `docs/scan-jobs.md`
- Tests: `crawler.test.ts`, `profiles.test.ts`, reclaim/normalize suites

## Before vs after

**Before:** quick one-shot crawl → silent sitemap → freeze at 18%; standard+
could stall if ticks could not schedule.

**After:** one incremental path for all profiles → budgeted discover with
heartbeats → reclaim + concurrent timed extracts → fire-and-forget (or
fallback) ticks → drain → post-crawl.

## Smoke targets

Manual / staging: BibleFunLand.com, SignalDeskBlog.com, GetCitePilot.com,
plus WordPress / Shopify / Next.js fixtures where feasible.

## Enterprise-scale recommendations

1. Move heavy crawl ticks to a **Render background worker** with Postgres
   `FOR UPDATE SKIP LOCKED` (Neon HTTP cannot hold interactive locks).
2. Separate discover / read / analyze queues with independent autoscaling.
3. Persist per-URL fetch traces for support (already partially in `scanMeta`).
4. Keep Quick at ~25 pages for interactive UX; use deep/enterprise on worker
   path with higher caps.
5. Optional Firecrawl / third-party fetch for JS-heavy sites when Playwright is
   disabled in serverless.
