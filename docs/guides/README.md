# MoneyGap Guides (Developer Guides Hub)

Public product name: **MoneyGap Guides** (nav: **Guides**). Internal name: Developer Guides Hub.

## What it is

Framework-aware technical knowledge base at `/guides`. Shared concept content + per-framework overlays compose into published guide pages. Separate from:

- Product `/docs` (operator-facing help)
- Growth Academy (`/academy`, including `/academy/c/guides`)
- Developer Hub™ (`/dashboard/developers` — API keys)

## URLs

| Route | Purpose |
| --- | --- |
| `/guides` | Hub: frameworks + categories + search entry |
| `/guides/[framework]` | Published topics for one framework |
| `/guides/[framework]/[topic]` | Full merged guide |
| `/guides/search` | Client full-text search + filters |

## Seed (v1)

Frameworks with overlays: `nextjs`, `react`, `astro`  
Topics: `core-web-vitals`, `metadata`, `llms-txt`, `schema-org`, `accessibility`, `image-optimization`  
→ **18 published guides** (concept + overlay required).

## Docs in this folder

- [architecture.md](./architecture.md) — content model, load/merge, registries
- [authoring.md](./authoring.md) — how to write concepts and overlays
- [framework-extension.md](./framework-extension.md) — adding a framework
- [roadmap.md](./roadmap.md) — CMS, more overlays, search upgrades

## Code

- Content: `content/guides/`
- Lib: `src/lib/guides/`
- UI: `src/components/guides/`, `src/app/(marketing)/guides/`
