# SEO Intelligence™ (Self Optimization)

## Mission

Combine the Money Gap Engine™ **SEO module** with deterministic HTML/site-file scanners for evidence-backed SEO gaps on MoneyGap’s own site.

## What is scanned

Per page (live fetch):

- Title tags, meta descriptions, canonical
- Open Graph / Twitter cards
- H1/H2 structure, image alt text
- Internal / external links
- JSON-LD types

Site files:

- `robots.txt`
- `sitemap.xml` / `sitemap_index.xml`

## Scoring

`src/lib/self-optimization/seo/score.ts` weights evidence into an SEO score 0–100 and emits findings with Fix Path™, confidence, and verification steps.

**Crawlability Score™** is a separate health metric (higher = better crawl/discovery). See `docs/crawlability-score.md` and `docs/crawlability-engine.md`.

## Engine composition

The existing LLM SEO module (`src/lib/analysis/engine/modules/seo.ts`) continues to power customer analyses. Self Optimization links the latest completed analysis opportunities when available. Customer analyses also soft-run the Crawlability Engine and attach high/critical crawl issues as SEO opportunities.

## Soft limits

No fabricated rankings or traffic. Unreachable pages produce findings with HTTP evidence only.

## Related

- `docs/self-optimization.md`
- `docs/metadata-engine.md`
- `docs/moneygap-engine.md`
