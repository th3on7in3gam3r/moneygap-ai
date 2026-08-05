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
            → scheduleScanTick (POST /api/scan/tick)
            → runPostCrawlAnalysis when queue drained
```

### Phases (`scanPhase`)

`queued` → `discovering` → `processing` → `analyzing` → `completed`  
Also: `paused`, `cancelled`, `failed`, `waiting`, `retrying`.

### Tick (`POST /api/scan/tick`)

- Auth: `Authorization: Bearer $CRON_SECRET` (or internal secret header).
- Claims up to `batchSize` pages (`queued` / `retry` → `processing`).
- Extracts via moneygap-crawler, mirrors into `website_pages`.
- Updates `pagesCompleted` / `pagesFailed` / `estimatedRemainingMs`.
- Reschedules via `after()` / `waitUntil` until drained, then post-crawl.

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
- `CRON_SECRET` — required to authorize `/api/scan/tick`
- `FIRECRAWL_API_KEY` — optional fallback for empty Quick crawls
- `PLAYWRIGHT_ENABLED=1` — optional JS render on extract
