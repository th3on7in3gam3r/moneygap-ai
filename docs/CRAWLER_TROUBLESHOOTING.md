# Crawler Troubleshooting

## Scan stuck on “Reading pages”

1. Check analysis `scanMeta`:
   - `execution` — `apify` | `worker` | `ticks`
   - `providerRunId`, `providerStatus`
   - `lastProgressAt`, `crawlDeadlineAt`
   - `tickScheduleError`
2. If `execution=apify`: open Apify Console → run ID; confirm RUNNING/SUCCEEDED.
3. If `execution=worker`: check Render crawl worker logs; confirm `DATABASE_URL` shared.
4. Confirm Vercel env: `APP_URL`, `CRON_SECRET`, `APIFY_API_TOKEN`.
5. Status poll should kick after stall thresholds (90s tick / 3m discover / 3m worker).
6. Worst case: stale fail unlocks UI within ≤3h (true ceiling).

## Missing provider tokens

| Symptom | Fix |
|---------|-----|
| Log: `Apify unavailable: APIFY_API_TOKEN not configured` | Set token on Vercel (+ worker) |
| Firecrawl skipped | Set `FIRECRAWL_API_KEY` |
| Scrape.do skipped | Set `SCRAPEDO_API_TOKEN` |
| Only native runs | Expected when remotes missing |

Disable Apify: omit token or `CRAWL_PROVIDER=native`.

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

## Manual test matrix

A. Small static site  
B. Next.js site  
C. JS-heavy SPA  
D. WordPress  
E. Large blog  
F. Sitemap-heavy  
G. No sitemap  
H. Redirect-heavy  
I. Several 404s  
J. 403-protected pages  
K. Unreachable domain (expect FAIL)  
L. Malformed URL (expect FAIL early)  
M. Apify mocked failed → Firecrawl/native  
N. Firecrawl mocked failed → Scrape.do/native  
O. Re-test sites that previously hung on Reading pages  

## Cost protection

Per scan: ≤1 Apify start, ≤1 Firecrawl recovery pass, ≤N Scrape.do URLs (profile-capped), ≤1 native emergency.
