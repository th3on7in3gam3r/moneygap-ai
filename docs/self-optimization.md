# Self Optimization™

## Mission

MoneyGap uses its own Money Gap Engine™ and deterministic scanners to continuously analyze and improve **itself** — becoming its own best case study.

## Phase

Phase 20.6 — Self Optimization™ + SEO Intelligence™ + AI Prompt Engine™

## Principles

- Soft-fail via `FEATURE_SELF_OPTIMIZATION` (default on; `0` / `false` / `off` disables)
- Never use mock data; unavailable providers show empty/setup states with reasons
- Estimates labeled **AI Estimate** / projections
- No sidebar redesign — deep-link `/dashboard/self-optimization`
- Never auto-publish metadata or content
- Do not rewrite MoneyGap Score™ / Opportunity Index™ formulas

## Surfaces

| Surface | Path |
| --- | --- |
| Dashboard | `/dashboard/self-optimization` |
| Overview / Settings deep-links | secondary buttons |
| APIs | `/api/self-optimization/*` |
| Cron | `POST /api/cron/self-optimization` |

## Scan target

`SELF_OPTIMIZATION_URL` → `APP_URL` / `RENDER_EXTERNAL_URL` / `NEXT_PUBLIC_APP_URL` → `https://moneygap.ai`, with optional workspace override in `self_optimization_settings`.

## Code map

- `src/lib/self-optimization/` — flag, config, scan, SEO, content gaps, trust, conversion, performance, backlinks, AI visibility, prompts, metadata, scores, reports
- `src/db/schema.ts` — `self_optimization_*` tables
- `src/app/dashboard/self-optimization/page.tsx`
- `render.yaml` — `moneygap-self-optimization` cron (13:00 UTC)

## Related

- `docs/seo-intelligence.md`
- `docs/content-gap-engine.md`
- `docs/backlink-engine.md`
- `docs/metadata-engine.md`
- `docs/ai-prompt-engine.md`
- `docs/self-scan.md`
- `docs/moneygap-engine.md`
