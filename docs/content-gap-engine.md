# Content Gap Engine™

## Mission

Detect missing MoneyGap marketing and product surfaces by comparing live HTTP responses against an expected path catalog.

## Catalog

Defined in `src/lib/self-optimization/content-gaps/catalog.ts`, including Features, Pricing, Integrations, API, Docs, Blog, Academy, Security, Privacy, Terms, Case Studies, Alternatives, Industries, Use Cases, Changelog, Roadmap, Status, Support, and more.

## Output

Each missing path becomes a Self Optimization finding with:

- Business impact (AI Estimate)
- Fix Path™
- Verification checklist

## Scoring

Content Coverage score = share of expected paths returning HTTP 200 among probed URLs.

## Editorial recommendations (Growth Academy™)

Path probes remain the Self Optimization Content Coverage score.

Separately, Growth Academy CMS maintains a **content idea queue** (`ga_content_ideas`) seeded from recurring Money Gap themes (meta descriptions, backlinks, technical SEO, conversion, schema, CWV, trust, buyer-intent content). Editors can create drafts from ideas; nothing auto-publishes.

See `docs/growth-academy.md` and `docs/blog-cms.md`.

## Related

- `docs/self-optimization.md`
- `docs/self-scan.md`
- `docs/growth-academy.md`
