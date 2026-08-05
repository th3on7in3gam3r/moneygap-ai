# Scan Profiles

MoneyGap AI supports four crawl profiles. Profile limits and batch sizes live in
[`src/lib/scan/profiles.ts`](../src/lib/scan/profiles.ts). The crawler package
keeps modes `quick | standard | deep`; **enterprise** maps to crawler `deep`
with higher app-level caps and concurrency.

| Profile | maxPages | Crawler mode | Execution |
|---------|----------|--------------|-----------|
| **quick** | 25 | `quick` | Single in-process `crawlWebsite` then Engine |
| **standard** | 250 | `standard` | Discover → batched ticks (≈10 pages/tick) |
| **deep** | 5,000 | `deep` | Same tick loop; pause / resume / cancel |
| **enterprise** | 50,000 soft cap | `deep` | Larger batches + higher concurrency |

## Pre-scan estimator

`POST /api/scan/estimate` with `{ url }` runs a lightweight `discoverOnly()`
pass (robots, sitemaps, homepage framework / link density) and returns:

- `estimatedPages`, `complexity`, `framework`, `jsRequired`, `sitemapFound`
- `etaByProfile`, `recommendedProfile`, `guidance`, `estimatedCostUnits`

UI: Analyze form and onboarding integrations step show the estimate + profile
picker before `POST /api/analysis` / `POST /api/onboarding/start-scan`.

Default for dashboard analyze: **standard** (or estimator recommendation).  
Default for onboarding when no estimate: **quick**.

## Billing note

`estimatedCostUnits` is a heuristic only (≈1 unit per 10 pages at recommended
depth). Scan billing by cost is intentionally out of scope for v1.
