# Scan Engine V3 — Architecture Audit

## Current end-to-end flow (legacy)

1. **Create** — `POST /api/analysis` inserts `website_analyses`, then `after(() => runAnalysisPipeline)`.
2. **Acquire** — `startCrawlAcquisition` → Apify (async + ticks) / Firecrawl / native discover. With `SCAN_EXECUTION=worker`, pages drain on Render `moneygap-crawl-worker`.
3. **Handoff** — Worker `notifyScanComplete` → `POST /api/scan/complete` → `after(runPostCrawlAnalysis)` on **Vercel**.
4. **Intelligence** — `generateWebsiteIntelligence` (OpenAI) inside `finishPipelineWithPages`.
5. **Persist** — `reports`, profiles, insights.
6. **MoneyGap + roadmap** — `persistMoneyGapEngineResult` (11 module LLMs + deterministic roadmap).
7. **Competitive** — `persistCompetitiveIntelligence`.
8. **UI poll** — `GET /api/analysis/[id]` every ~1.5s; stall kicks / stale fail / resume.

## Root architectural problem

Long stages run in Vercel `after()` / tick chains with json-meta leases. Serverless kill after claim leaves orphans (`already_claimed`, preparing hang, 30m stale fail). Heartbeats and one-off patches cannot fix ownership of multi-minute AI work.

## Reuse unchanged

| Area | Location |
|------|----------|
| Providers | `src/lib/scan/crawlers/*` (Apify, Firecrawl, Scrape.do, native) |
| Profiles | `src/lib/scan/profiles.ts` (`quick` = Basics) |
| MoneyGap modules / scoring / roadmap builder | `src/lib/analysis/engine/*` |
| Competitive engine | `src/lib/analysis/competitive/*` |
| Auth / billing / reports schema | Clerk, `src/lib/billing`, `reports` table |
| Crawl queue | `crawl_jobs` / `crawl_pages` |

## Must move to durable worker (V3)

| Work | Why |
|------|-----|
| Post-crawl OpenAI intelligence | `maxDuration` / `after()` death |
| MoneyGap module fan-out | Multi-minute wall clock |
| Roadmap / competitive (when enabled) | Same |
| Stage leases + heartbeats | DB-enforced, reclaimable |

## Schema gaps (addressed in V3)

- No first-class job/stage machine (only `website_analyses.stage` + `scanMeta`)
- `website_pages` lacked UNIQUE(`analysis_id`,`url`) → duplicate rows
- Crawl worker had no `OPENAI_API_KEY` (crawl-only)

## V3 target

`scan_jobs` + `scan_job_stages` with atomic leases. Render scan worker claims stages. Vercel creates/stops/status only. Flag: `SCAN_ENGINE_V3=1`.
