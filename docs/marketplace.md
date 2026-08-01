# MoneyGap Marketplace™ & Growth Ecosystem™

## Mission

Transform MoneyGap into an open platform where businesses, agencies, developers, and partners discover, share, install, and monetize growth solutions—without rewriting Engine, Automation, or Knowledge Graph cores.

## Phase

**Phase 22 — MoneyGap Marketplace™ & Growth Ecosystem™**  
(Brief “Phase 19 Marketplace”; Team Workspace is Phase 21.)

## Principles

- Soft-fail behind `FEATURE_MARKETPLACE` (default on unless `=0`).
- **Compose** Automation Marketplace™, KG Industry Packs, Fix Path Chooser™, API / Developer Hub, Growth Pattern Library™.
- Install = workspace-bound **copies** (drafts / pins / bookmarks)—never auto-publish.
- No third-party code execution runtime in this phase.
- No Stripe Connect / live listing checkout; revenue-share is ledger stubs + **AI Estimate**.
- Enhance shell only (`/dashboard/marketplace`); no sidebar redesign.
- Distinct from **Automation Marketplace™** (Phase 17 internal workflow templates)—those are *sourced into* this catalog.

## Modules

| Module | Role |
| --- | --- |
| Growth Marketplace™ | Browse / install catalog |
| AI Agent Marketplace™ | Agent + recipe listings |
| Industry Intelligence Packs™ | KG industry / playbook packs |
| Fix Path™ Library | Browseable Fix Path templates |
| Developer Hub™ | Compose `/dashboard/developers` + SDK docs |
| Partner Directory™ | Verified partners |
| Growth Academy™ | Curated courses |
| Community Ratings™ | Reviews + aggregates |
| Marketplace Analytics™ | Install / rating / stub revenue rollups |

## Categories

`ai_agents` | `industry_packs` | `growth_playbooks` | `automation_recipes` | `dashboard_widgets` | `reporting_templates` | `blueprint_collections` | `fix_path_templates`

## Surfaces

| Surface | Role |
| --- | --- |
| `/dashboard/marketplace` | Marketplace Center™ |
| `/api/marketplace/*` | Catalog, install, reviews, partners, academy, insights, analytics |
| `packages/moneygap-js`, `packages/moneygap-python` | Thin REST SDK stubs |

## Code map

- `src/lib/marketplace/`
- Schema: `marketplace_*`, `academy_*`, `verified_growth_insights`

## Related

- [`plugin-sdk.md`](./plugin-sdk.md)
- [`growth-patterns.md`](./growth-patterns.md)
- [`partner-program.md`](./partner-program.md)
- [`automation-engine.md`](./automation-engine.md)
- [`growth-pattern-library.md`](./growth-pattern-library.md)
- [`api-platform.md`](./api-platform.md)

## Out of scope

Live payouts; plugin host/runtime; replacing Automation Marketplace™ or KG admin; Score/OI rewrite.
