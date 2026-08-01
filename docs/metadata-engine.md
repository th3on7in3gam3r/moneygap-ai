# Metadata Engine™

## Mission

Generate optimized SEO titles, meta descriptions, Open Graph, Twitter/X, canonical, and JSON-LD proposals for MoneyGap pages — with preview before any apply.

## Flow

1. Fetch live HTML (`fetchPageSeo`)
2. `proposeMetadata` builds current vs proposed + copy-ready snippet
3. Persist `self_optimization_metadata_drafts` as `draft`
4. User confirms via `POST /api/self-optimization/metadata/apply`
5. Status → `applied`; snippet returned for paste into layouts

**Never auto-publishes** production marketing files.

## APIs

- `POST /api/self-optimization/metadata/generate` — `{ pageUrl, scanId? }`
- `POST /api/self-optimization/metadata/apply` — `{ draftId, action: "apply" | "reject" }`

## Schema types

Organization + SoftwareApplication JSON-LD by default; extend per page as needed (FAQ, Breadcrumb).

## Related

- `docs/self-optimization.md`
- `docs/seo-intelligence.md`
