# Scan Jobs (Worker + Serverless Fallback)

User-facing job IDs remain on **`websiteAnalyses`**. Durable page queue uses
**`crawl_jobs` / `crawl_pages`**. MoneyGap Engine scoring, Clerk auth, and report
shapes are unchanged.

## Preferred production path — Render crawl worker

```
POST /api/analysis (+ scanProfile)
  → after(runAnalysisPipeline)
     → runIncrementalDiscover (robots + sitemap + enqueue crawl_pages)
     → set crawl_jobs.status = queued, scanMeta.execution = worker
  → moneygap-crawl-worker (long-lived)
     → FOR UPDATE SKIP LOCKED claim job
     → drain crawl_pages (extract + mirror website_pages)
     → POST /api/scan/complete (CRON_SECRET) → runPostCrawlAnalysis
```

Enable on the **web** service:

```
CRAWL_WORKER_ENABLED=1
SCAN_EXECUTION=worker
APP_URL=https://www.moneygap-ai.com
CRON_SECRET=…
DATABASE_URL=…   # same Neon DB as worker
```

Worker service `moneygap-crawl-worker` in [`render.yaml`](../render.yaml) needs the
**same `DATABASE_URL`**, plus `APP_URL` + `CRON_SECRET` to call `/api/scan/complete`.

## Fallback — serverless ticks (local / Vercel-only)

When `CRAWL_WORKER_ENABLED` is unset/`0` or `SCAN_EXECUTION=ticks`:

```
runIncrementalDiscover → processScanTick loop (~50s)
  → scheduleScanTick → POST /api/scan/tick
  → runPostCrawlAnalysis when drained
```

### Tick (`POST /api/scan/tick`)

- Auth: `x-cron-secret` or `Authorization: Bearer $CRON_SECRET`
- Reclaims stale `processing` rows, concurrent extracts, fire-and-forget reschedule

### Complete (`POST /api/scan/complete`)

- Auth: same cron secret
- Invoked by the worker after page drain; starts `runPostCrawlAnalysis` via `after()`

## Caps

- `maxPages`: quick **25**, standard **100**, deep **500**, enterprise **5_000**
- Worker `CRAWL_MAX_RUNTIME_MS` default **900000** (15 min); requeues if budget hit

## Env cheat sheet

| Var | Web | Worker |
|-----|-----|--------|
| `DATABASE_URL` | yes | yes (same) |
| `CRAWL_WORKER_ENABLED=1` | yes | — |
| `SCAN_EXECUTION=worker` | yes | — |
| `CRON_SECRET` | yes | yes |
| `APP_URL` | yes | yes |
| `PLAYWRIGHT_ENABLED` | `0` | `1` |
| `OPENAI_API_KEY` | yes (post-crawl) | — |

## Smoke

```bash
npx tsx scripts/smoke-worker-crawl.ts
SMOKE_URL=https://www.signaldeskblog.com npx tsx scripts/smoke-worker-crawl.ts
```

## Fault-tolerance

See [crawl-engine-fault-tolerance.md](./crawl-engine-fault-tolerance.md).
