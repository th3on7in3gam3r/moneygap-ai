# Crawl Engine Fault Tolerance

## Root cause of “Reading Pages” (~15–20%) hangs

Scans entered `scanPhase: processing` with stage `Reading pages (0/N)` at
progress **15%**, then never advanced.

Primary hang chain:

1. Discover enqueued URLs and set progress to 15%.
2. Tick claimed pages into `processing`, then extracted **sequentially**.
3. Batch work exceeded Vercel tick `maxDuration` (~60s) → invocation killed.
4. Orphaned rows stayed `processing`.
5. Empty-claim path said “stale processing — leave for next tick” and **never
   reclaimed**.
6. `scheduleScanTick` **awaited** nested `/api/scan/tick` with **no timeout**,
   amplifying hangs.
7. Progress only updated **after** a full batch → UI frozen at 15% during work.
8. Queue never drained → `runPostCrawlAnalysis` never ran.

### Amplifiers

| Bug | Why it hung |
|-----|-------------|
| Infinite `markFailed(..., retry:true)` | Ignored `attempts` → livelock |
| Non-atomic claim | Concurrent ticks double-claimed / raced |
| URL normalize kept `utm_*` / hash variants | Inflated queue under serverless budget |
| Playwright `chromium.launch` unbounded | Could stall extract |
| Missing `CRON_SECRET` / `APP_URL` | Ticks silently stopped after first loop |

This was **not** an AI/Money Gap Engine hang — post-crawl never started.

## Fixes shipped

### Queue

- `reclaimStaleProcessing` (20s TTL) → `retry` or `failed` at 3 attempts
- Attempt-capped `markFailed`
- State-guarded atomic UPDATE…RETURNING claim (Neon HTTP–safe)

### Tick scheduling

- Fire-and-forget via Next `after()` + `AbortSignal.timeout(5000)`
- In-tick wall budget ~45s; defer remaining pages to next tick
- Surfaces `scanMeta.tickScheduleError` when env missing

### Concurrent reads + progress

- Concurrency **5** with `Promise.allSettled`
- Per-page progress / counters / `currentUrl`
- `withTimeout(extract, 15s)` around each page

### Watchdog + logging

- 20s no-progress watchdog aborts active extracts and requeues
- Structured logs: `[SCAN]`, `[CRAWLER]`, `[FETCH]`, `[QUEUE]`, `[PROGRESS]`,
  `[WATCHDOG]`

### Normalization + caps

- Strip hash, tracking params, trailing slash; force https
- quick/standard: maxPages 30/50, depth 2, concurrency 5

### Fetch / Playwright

- AbortController on every fetch; body respects abort
- Playwright launch / content / close raced with timeouts; context always closed

### Stages

- Engine stages recorded in `scanMeta.stageDiagnostics`
- Partial successful reads still enter extract/BI; zero pages still fail

## Files modified

- `src/lib/scan/batch.ts`
- `src/lib/scan/continue.ts`
- `src/lib/scan/reclaim.ts` (new)
- `src/lib/scan/watchdog.ts` (new)
- `src/lib/scan/scan-log.ts` (new)
- `src/lib/scan/providers/defaults.ts`
- `src/lib/scan/providers/types.ts`
- `src/lib/scan/profiles.ts`
- `src/lib/analysis/stages.ts`
- `src/lib/analysis/pipeline.ts`
- `packages/moneygap-crawler/src/discovery/normalize.ts`
- `packages/moneygap-crawler/src/renderers/fetch-static.ts`
- `packages/moneygap-crawler/src/renderers/playwright.ts`
- `docs/scan-jobs.md`
- Tests: `reclaim.test.ts`, `normalize.test.ts`, updated `profiles.test.ts`

## Before vs after

**Before:** sequential extract → orphan `processing` → no reclaim → nested await
tick → freeze at 15%.

**After:** reclaim → concurrent timed extracts → per-page progress → watchdog →
fire-and-forget ticks → drain → post-crawl.

## Performance

- Up to 5× page throughput per tick vs sequential (bounded by 15s timeouts).
- Fewer wasted pages via tracking-param dedup.
- Ticks stay under ~45s wall to leave headroom for Vercel `maxDuration=60`.

## Enterprise-scale recommendations

1. Move heavy crawl ticks to a **Render background worker** with Postgres
   `FOR UPDATE SKIP LOCKED` (Neon HTTP cannot hold interactive locks).
2. Separate discover / read / analyze queues with independent autoscaling.
3. Persist per-URL fetch traces for support (already partially in `scanMeta`).
4. Keep product scans at 30–50 pages for interactive UX; use deep/enterprise
   only on worker path with higher caps.
5. Optional Firecrawl / third-party fetch for JS-heavy sites when Playwright is
   disabled in serverless.
