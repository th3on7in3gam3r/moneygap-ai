# Crawlability Score™

## Mission

Crawlability Score™ measures how easily search engines and AI systems can **discover, crawl, and understand** a website. It is a first-class MoneyGap health metric — not a checkbox for “robots.txt exists.”

## Polarity

| Metric | Higher means |
| --- | --- |
| **Crawlability Score™** | Healthier crawl / discovery (Excellent → Critical) |
| **MoneyGap Score™** | More uncaptured business opportunity left |

Do not mix these polarities in UX copy.

## Status bands

| Score | Status |
| --- | --- |
| 90–100 | Excellent |
| 75–89 | Good |
| 50–74 | Needs Attention |
| 0–49 | Critical |

## Contributors

- robots.txt
- Sitemap
- Canonical
- Internal Links
- Redirects
- Indexability (meta robots, X-Robots-Tag, HTTPS, AI signals, breadcrumbs)

## Surfaces

1. **Self Optimization™ / Technical SEO Intelligence™** — score card on `/dashboard/self-optimization`; detailed report at `/dashboard/self-optimization/crawlability` (executive summary, breakdown, issues, trend).
2. **Customer analyses** — `reports.crawlabilityReport` + additive card on `/reports/[id]`; critical/high issues also appear as SEO · Crawlability opportunities with Fix Path™.

## Issue schema

Every crawlability issue includes:

- Problem
- Why it matters
- Evidence
- Estimated business impact (AI Estimate)
- Confidence score
- Priority (`critical` \| `high` \| `medium` \| `low`)
- Fix Path™
- Estimated time
- Verification checklist

## Integrations

When Google Search Console, Google Analytics, or Cloudflare are not connected (or not wired for coverage APIs), Crawlability Score™ records **unavailable reasons** instead of inventing findings.

## Trend

Previous scan · Current scan · Improvement (delta). Higher crawlability over time is improvement.

## Related

- `docs/crawlability-engine.md` — probes, weights, caps
- `docs/seo-intelligence.md`
- `docs/scoring-system.md`
