# Scan Jobs (Serverless Pipeline)

User-facing job IDs remain on **`websiteAnalyses`**. Durable page queue uses
**`crawl_jobs` / `crawl_pages`**. MoneyGap Engine scoring, Clerk auth, and report
shapes are unchanged.

## Flow

```
POST /api/scan/estimate → profile picker
POST /api/analysis (+ scanProfile)
  → websiteAnalyses + after(runAnalysisPipeline)
     quick: crawlWebsite → finishPipelineWithPages
     other: runIncrementalDiscover → processScanTick loop
            → scheduleScanTick (fire-and-forget POST /api/scan/tick)
            → reclaim stale processing → concurrent extract
            → runPostCrawlAnalysis when queue drained
```

### Phases (`scanPhase`)

`queued` → `discovering` → `processing` → `analyzing` → `completed`  
Also: `paused`, `cancelled`, `failed`, `waiting`, `retrying`.

### Tick (`POST /api/scan/tick`)

- Auth: `Authorization: Bearer $CRON_SECRET` (or internal secret header).
- **Reclaims** `processing` rows older than 20s → `retry` (or `failed` after 3 attempts).
- Claims up to `batchSize` pages (`queued` / `retry` → `processing`) with state-guarded UPDATE…RETURNING.
- Extracts up to **5 pages concurrently**, each with a **15s** timeout.
- Updates progress **after each page** (`pagesCompleted` / `pagesFailed` / `currentUrl`).
- **Watchdog (20s)**: no progress → abort active extracts, requeue, continue.
- Reschedules via **fire-and-forget** `after(scheduleScanTick)` (5s AbortSignal on the HTTP call — never awaits nested ticks).
- When drained → post-crawl analysis.

### Caps (quick / standard)

- `maxPages`: quick **30**, standard **50** (hard enqueue ceiling 50 for those paths)
- `maxDepth`: **2**
- `concurrency`: **5**

Deep / enterprise keep higher caps but use the same reclaim / watchdog / concurrency machinery.

### Control APIs

| Endpoint | Role |
|----------|------|
| `GET /api/analysis/[id]` | Includes phase, counters, ETA, `currentUrl` |
| `POST .../pause` | Sets `paused`; ticks no-op |
| `POST .../resume` | Unpause + schedule tick |
| `POST .../cancel` | Fail analysis + cancel crawl job/pages |

## Providers

Interfaces in `src/lib/scan/providers/` (`CrawlerProvider`, `QueueProvider`,
`StorageProvider`, `ProgressProvider`, `NotificationProvider`) with Neon /
moneygap-crawler defaults. A future Render worker can implement the same
contracts without UI changes.

## Migration from single `after()` crawl

Previously one Vercel invocation crawled the whole site. Standard+ profiles now
checkpoint after each batch so invocations stay under ~60s. Quick keeps the
previous in-process crawl for speed.

## Env

- `OPENAI_API_KEY` — required for post-crawl Engine
- `CRON_SECRET` — **required** to authorize `/api/scan/tick` (missing → ticks stop after first ~50s loop; `scanMeta.tickScheduleError` set)
- `APP_URL` / `NEXT_PUBLIC_APP_URL` — tick self-invoke origin
- `FIRECRAWL_API_KEY` — optional fallback for empty Quick crawls
- `PLAYWRIGHT_ENABLED=1` — optional JS render on extract (launch/content timed)

## Fault-tolerance report

See [crawl-engine-fault-tolerance.md](./crawl-engine-fault-tolerance.md).
