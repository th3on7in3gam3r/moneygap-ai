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

`POST /api/scan/estimate` with `{ url }` runs the **connectivity diagnostics
pipeline** first (DNS → TCP → TLS → homepage GET → robots → sitemap → framework),
then returns profile recommendations. See
[connectivity-diagnostics.md](./connectivity-diagnostics.md).

Returns:

- `estimatedPages`, `complexity`, `framework`, `jsRequired`, `sitemapFound`
- `etaByProfile`, `recommendedProfile`, `guidance`, `estimatedCostUnits`
- `diagnostics` (staged connectivity object) on success **and** failure
- `warnings` for soft issues (e.g. missing sitemap)

UI: Analyze form and onboarding show actionable `summary` errors plus expandable
**Technical details**. Profile picker remains after a successful estimate.

Default for dashboard analyze: **standard** (or estimator recommendation).  
Default for onboarding when no estimate: **quick**.

## Billing note

`estimatedCostUnits` is a heuristic only (≈1 unit per 10 pages at recommended
depth). Scan billing by cost is intentionally out of scope for v1.
