# Crawler Root Cause Audit — “Reading Pages” Stalls

Audit of the MoneyGap scan acquisition layer. Findings are tagged from **code inspection only**.

Date: 2026-08-10  
Scope: `src/lib/scan/`, `src/lib/analysis/pipeline.ts`, `packages/moneygap-crawler/`, `src/lib/scan/crawlers/`

---

## CONFIRMED

### 1. Worker execution never receives stall kicks

[`src/lib/scan/continue.ts`](../src/lib/scan/continue.ts) — `kickStalledScanIfNeeded` returns early when `scanMeta.execution === "worker"`.

If `CRAWL_WORKER_ENABLED=1` / `SCAN_EXECUTION=worker` and the Render worker is down or misconfigured, the analysis stays in `scanPhase: "waiting"` with stage copy like “Queued N pages…” until `failStalePreReportAnalysis` eventually fails the scan.

### 2. Mid-discover kill blocks self-heal; empty-queue ticks reschedule forever

`kickStalledScanIfNeeded` refuses to kick while `scanPhase` is discovering / early `scanStage`s (robots, sitemap, discovery, queue).

[`src/lib/scan/batch.ts`](../src/lib/scan/batch.ts) — when the queue is empty during discover, ticks **reschedule** instead of failing, to avoid false fails. If `after(runAnalysisPipeline)` dies mid-discover, status polls cannot kick, and empty-queue ticks can spin until the stale-fail budget.

### 3. Stale pre-report “hard ceiling” is not a true ceiling

[`src/lib/analysis/pipeline.ts`](../src/lib/analysis/pipeline.ts) — `failStalePreReportAnalysis` uses:

```ts
Math.max(
  PRE_REPORT_STALE_MS,
  estimatedRemainingMs + 15m,
  Math.min(3h, 30m + pagesCompleted * 2s),
)
```

The `Math.min(3h, …)` term is a **third floor** inside `Math.max`, so large `estimatedRemainingMs` can push unlock past 3 hours. Truly hung jobs may leave the UI on “Reading pages” longer than intended.

### 4. Tick self-schedule depends on `APP_URL` / `CRON_SECRET`

[`src/lib/scan/continue.ts`](../src/lib/scan/continue.ts) — missing secrets set `tickScheduleError` and attempt in-process `after()` fallback. That fallback can die with the serverless invocation. Without successful kicks (or when kicks are blocked), the scan waits for stale-fail.

Historical production evidence (prior incident): tick HTTP 401 when auth did not accept cron secret correctly, combined with empty-queue false-fail races.

### 5. Apify RUNNING continues until profile budget

[`src/lib/scan/crawlers/watchdog.ts`](../src/lib/scan/crawlers/watchdog.ts) — while Apify status is `RUNNING`/`READY`, the watchdog continues (even with stale heartbeat) until `profileTimeoutMs` (quick ~4m … enterprise ~45m). The checklist stage remains “Reading pages” for the duration. This is intentional for async actors but produces long static UI without stage nuance if progress fields are sparse.

### 6. Provider fallback previously discarded successful pages

[`src/lib/scan/crawlers/acquisition.ts`](../src/lib/scan/crawlers/acquisition.ts) — `persistPages` deletes all `website_pages` then writes one provider’s set. Apify → Firecrawl fallback could throw away usable Apify pages and restart acquisition-style work. (Addressed by Orchestrator SuccessfulPageMap.)

---

## LIKELY

### 7. Sync Firecrawl inside serverless `after()` can strand mid-fallback

`crawlWithFirecrawl` runs with ~140s budget inside acquisition/fallback. If the Vercel `after()` invocation is killed mid-scrape, the job may exist with an empty queue and no Apify poll loop — next kick may empty-queue-fail or wait for stale-fail.

### 8. `withTimeout` does not cancel underlying Playwright work

[`src/lib/scan/watchdog.ts`](../src/lib/scan/watchdog.ts) — Promise.race timeout frees the tick path but does not abort the extract promise. Concurrent timed-out extracts can contend for a shared browser and amplify perceived stalls under `PLAYWRIGHT_ENABLED=1`.

### 9. Worker product drain updates progress after batches

[`packages/moneygap-crawler/src/worker.ts`](../packages/moneygap-crawler/src/worker.ts) — progress updates after `Promise.all` on a batch. A slow batch can look frozen between updates (reclaim ~20s).

---

## NOT OBSERVED

| Item | Notes |
|------|--------|
| Unbounded sitemap discovery | Discover uses timed fetches and budgets (~tens of seconds worst case) |
| Missing `lastProgressAt` on normal progress updates | `defaultProgressProvider.update` always writes `lastProgressAt` |
| Unbounded robots crawl-delay sleeps on product tick path | Not used that way in current batch extract loop |
| Infinite recursive URL discovery without page caps | Profiles enforce `maxPages` |

---

## Self-heal chain (as of audit)

| Mechanism | Role | Gap |
|-----------|------|-----|
| `kickStalledScanIfNeeded` | Re-schedule tick after stall | Skips discover + worker |
| Tick reclaim + wall/watchdog | Unstick per-tick hangs | Needs ticks running |
| Apify `decideApifyWatchdog` | Fallback after profile timeout | Continues while RUNNING |
| `failStalePreReportAnalysis` | Fail hung pre-report runs | Budget can be very long |

---

## Remediation mapping (Orchestrator™)

| Finding | Fix |
|---------|-----|
| Worker no kick | Allow stall kick / complete poll when worker heartbeat stale |
| Discover forever | Discover-stall threshold → kick or fail; stop infinite empty-queue reschedule |
| Fake 3h ceiling | True `Math.min(..., HARD_CEILING_MS)` on stale budget |
| Discard pages on fallback | SuccessfulPageMap merge across Apify → Firecrawl → Scrape.do |
| Long Reading Pages | Stage machine + recovery copy + monotonic progress |
| No global deadline | `crawlDeadlineAt` across all providers; partial complete if viable |
