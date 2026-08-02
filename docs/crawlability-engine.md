# Crawlability Engine™

## Purpose

Deterministic probes + weighted scoring that power Crawlability Score™. Shared by Self Optimization™ and the MoneyGap Engine™ persistence path.

## Code map

| Path | Role |
| --- | --- |
| `src/lib/crawlability/` | Public engine |
| `audit.ts` | `runCrawlabilityAudit(origin, opts)` |
| `score.ts` | Contributor buckets + findings |
| `status.ts` | Excellent / Good / Needs Attention / Critical |
| `probes/robots.ts` | robots.txt fetch + Disallow / Sitemap parse |
| `probes/sitemap.ts` | XML validity, locs, lastmod freshness |
| `probes/links.ts` | Page HTML/headers, redirect chains/loops, llms.txt |
| `probes/structure.ts` | Broken links, orphans, depth, URL consistency |
| `integrations.ts` | GSC/GA/Cloudflare unavailable notes |
| `to-money-gap.ts` | Map high/critical findings → SEO Money Gaps |

## Caps

- Deep page probes: default **12** (max ~40)
- Internal link HEAD/GET checks: default **16–20**
- Soft-fail: audit errors never block MoneyGap Engine or self-scan completion

## Factors covered

robots.txt · sitemap presence/validity/freshness · meta robots · X-Robots-Tag · canonicals/conflicts · orphans · broken internal links · redirect chains/loops · HTTP status · soft 404 heuristics · crawl depth · URL consistency · duplicates · pagination rel · hreflang (when present) · JS-heavy shells · nav/breadcrumbs · llms.txt / JSON-LD AI discoverability · HTTPS

## Unavailable data rule

Never fabricate Search Console coverage, GA traffic, or Cloudflare bot analytics. Emit `unavailableReasons` keys instead.

## Self Optimization wiring

- Column `self_optimization_scores.crawlability` (+ status, contributors, summary)
- Findings `category = crawlability` with `priority`
- Rollup includes crawlability in overall average when present

## Customer analysis wiring

- After MoneyGap Engine LLM modules, soft-run `runCrawlabilityAudit`
- Persist `reports.crawlabilityReport`
- Merge critical/high findings into opportunities (`moduleId: seo`)
- Monitor compare adds crawlability delta to analysis comparison reasons

## Related

- `docs/crawlability-score.md`
- `docs/self-optimization.md`
- `docs/seo-intelligence.md`
