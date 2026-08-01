# Growth Academy™

## Mission

Growth Academy™ is MoneyGap’s public content hub for SEO, conversion, AI visibility, product education, and thought leadership. It is distinct from Marketplace course Academy (`academy_courses`).

## Surfaces

| Surface | Path |
|---------|------|
| Public hub | `/academy` |
| Articles | `/academy/[slug]` |
| Categories | `/academy/c/[category]` |
| Tags | `/academy/tag/[tag]` |
| Authors | `/academy/author/[slug]` |
| Search | `/academy/search` |
| RSS | `/academy/rss.xml` |
| Blog alias | `/blog` → `/academy` |
| CMS | `/dashboard/academy` |

## Feature flag

`FEATURE_GROWTH_ACADEMY` — omit/unset = enabled; `0` / `false` / `off` disables.

## Data model

Tables prefixed `ga_*` (authors, categories, tags, articles, versions, events, content ideas).

## Editorial rules

- AI generation always creates **drafts**
- Human review required before publish
- Revenue/traffic claims labeled **AI Estimate**

## Related

- `docs/blog-cms.md`
- `docs/ai-publishing.md`
- `docs/content-strategy.md`
- `docs/content-gap-engine.md`
