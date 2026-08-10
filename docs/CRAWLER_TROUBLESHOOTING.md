# Crawler Troubleshooting

## Scan stuck on “Reading pages”

1. Check analysis `scanMeta`:
   - `execution` — `apify` | `worker` | `ticks`
   - `providerRunId`, `providerStatus`
   - `lastProgressAt`, `crawlDeadlineAt`
   - `tickScheduleError`
2. If `execution=apify`: open Apify Console → run ID; confirm RUNNING/SUCCEEDED.
3. If `execution=worker`: check Render crawl worker logs; confirm `DATABASE_URL` shared.
4. Confirm Vercel env: `APP_URL`, `CRON_SECRET`, `APIFY_API_TOKEN` (alias `APIFY_TOKEN` accepted).
5. Status poll should kick after stall thresholds (90s tick / 3m discover / 3m worker) and when **active** `crawlDeadlineAt` passes.
6. Active deadline (profile budget) ends the crawl with fail or partial — it does **not** wait for the 3h orphan ceiling.
7. Worst case orphan unlock: stale fail soft floor ~30m, hard ≤3h.

## Missing provider tokens

| Symptom | Fix |
|---------|-----|
| Log: `Apify unavailable: APIFY_API_TOKEN not configured` | Set `APIFY_API_TOKEN` (or alias `APIFY_TOKEN`) on Vercel (+ worker) |
| Firecrawl skipped | Set `FIRECRAWL_API_KEY` |
| Scrape.do skipped | Set `SCRAPEDO_API_TOKEN` or `SCRAPE_DO_API_TOKEN` |
| Only native runs | Expected when remotes missing |
| `tickScheduleError` mentions APP_URL | Set non-localhost `APP_URL` (or `NEXT_PUBLIC_APP_URL`) |
| `tickScheduleError` mentions CRON_SECRET | Set `CRON_SECRET` (header `x-cron-secret` / Bearer) |

Disable Apify: omit token or `CRAWL_PROVIDER=native`.

## Never indefinite “Reading Pages”

Expected terminal paths:

| Condition | Outcome |
|-----------|---------|
| Active `crawlDeadlineAt` exceeded + enough pages | `completed` + `partial` |
| Active deadline + insufficient pages | `failed` (friendly crawl error) |
| Apify FAILED / empty after recovery | Firecrawl → Scrape.do → native handoff or fail |
| Worker down | Stall kick ~3m; active deadline; stale soft unlock ~30m |
| Tick env broken | `tickScheduleError` + in-process fallback when possible |

If UI stays on Reading Pages past the profile budget, check `crawlDeadlineAt`, `tickScheduleError`, and worker/Apify status — not the 3h ceiling.

## Provider timeout / FAILED / ABORTED

Orchestrator preserves any Apify dataset pages, then Firecrawl targeted recovery, then Scrape.do, then native if still empty.

## 403 pages

Prefer Scrape.do rescue for remaining 403/anti-bot URLs (bounded). Do not restart whole-site crawl.

## 404 pages

Do not retry through all providers. Mark failed; continue with successful pages.

## Empty crawl

Native emergency discover/ticks runs only when corpus is below minimum viable.

## Partial crawl

`scanMeta.partial=true` with `status=completed` means Engine ran on usable pages with some failures remaining. This is intentional.

## Inspect diagnostics

From analysis row / status API:

```
crawlProvider, currentProvider, crawlStage
pagesDiscovered, pagesCompleted, pagesRecovered
crawlDiagnostics.providerDistribution
crawlDiagnostics.providerAttempts
```

Admin/developer surfaces may show provider run IDs. Customers see friendly copy only (“Recovering a few difficult pages…”).

## Manual production matrix

Non-credit first: `npx tsx --test scripts/smoke-crawl-orchestrator.ts` (mocked providers).

Then live (uses credits — run sparingly):

| # | Case | Expect |
|---|------|--------|
| A | Small static site | Complete ≤ active deadline |
| B | Next.js site | Complete / partial |
| C | JS-heavy SPA | Playwright/native or Apify pages |
| D | WordPress | Sitemap + pages |
| E | Large blog | Caps at profile max; may partial |
| F | Sitemap-heavy | Does not hang on discover |
| G | No sitemap | Homepage seeds; still terminates |
| H | Redirect-heavy | Follows; SSRF still blocked |
| I | Several 404s | Partial complete OK |
| J | 403-protected pages | Scrape.do rescue or skip; not indefinite |
| K | Unreachable domain | FAIL early |
| L | Malformed / private URL | FAIL early (SSRF) |
| M | Apify fail (mocked in smoke) | Firecrawl/native handoff |
| N | Empty primary past deadline | Non-viable → native or fail |
| O | Sites that previously hung | Must leave Reading Pages by deadline |

## Cost protection

Per scan: ≤1 Apify start, ≤1 Firecrawl recovery pass, ≤N Scrape.do URLs (profile-capped), ≤1 native emergency.
