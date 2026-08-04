# Guides architecture

## Composition

```
content/guides/concepts/{topic}.md     # shared: problem, why, mistakes, checklist, AI notes
content/guides/overlays/{fw}/{topic}.md # framework explanation, steps, code, deploy notes
src/lib/guides/                         # registries + load/merge + search index
src/app/(marketing)/guides/             # hub, framework, topic, search routes
```

A guide is **published only when both** concept and overlay files exist. Missing overlays are omitted from indexes and the sitemap (no thin stubs).

## Registries (data-driven)

| File | Role |
| --- | --- |
| `frameworks.ts` | 12 frameworks (id, name, slug, ecosystem) |
| `topics.ts` | All topic slugs + categories / tags / difficulty |
| `graph.ts` | Related-topic edges for “Related Guides” |
| `load.ts` | Merge concept + overlay → `GuideModel`; list published; search index |
| `parse.ts` | YAML frontmatter + H2 section split/merge |
| `types.ts` | Shared types |

## Merge model

`loadGuide(framework, topic)`:

1. Parse frontmatter from concept and overlay (overlay wins for title/description/difficulty/updated).
2. Split markdown bodies on known `##` headings.
3. Merge sections (overlay fills framework-specific slots; concept fills shared slots; overlay can append to mistakes/checklist).
4. Union tags and CLI commands (always includes `moneygap scan`).

Rendered page sections (when present): Problem Overview, Why It Matters, Framework-Specific Explanation, Step-by-Step, Code Examples, Common Mistakes, Validation Checklist, AI Readiness Notes, Deployment Checklist, Browser Extension Tips, Related Guides, product CTA rail.

## Search (v1)

`buildSearchIndex()` builds a JSON-serializable array of published guides at request/build time. `/guides/search` runs client-side filtering (query + framework, category, difficulty, tags, CLI). No Algolia/Pagefind in v1.

## SEO

- `buildPageMetadata` on hub, framework, topic, search
- Breadcrumb + TechArticle JSON-LD on guide pages
- Sitemap includes `/guides`, `/guides/search`, framework indexes with ≥1 published topic, and each published topic URL only
