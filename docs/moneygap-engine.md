# MoneyGap Engine™

## Purpose

The MoneyGap Engine™ discovers **business growth opportunities** from crawled website intelligence.

It is modular: each intelligence module runs independently and returns findings in a shared schema.

## Orchestration

1. Receive crawl corpus + Phase 2 business intelligence
2. Run intelligence modules (parallel or batched)
3. Normalize findings (priority, Opportunity Index™)
4. Compute MoneyGap Score™ + category scores
5. Build Executive Growth Brief + Growth Roadmap
6. Persist findings for `/reports/[id]`

**Knowledge Graph™ / Industry, Business Model & Growth Pattern Intelligence™ (Phase 13.4):** classify early (industry + business model, with optional overrides) and inject profile + matched pattern context into module prompts; after Engine findings, apply soft boosts, industry + BM gap snapshots, revenue architecture, pattern matching, and playbooks (before Trust). See `docs/knowledge-graph.md`, `docs/industry-intelligence.md`, `docs/business-model-intelligence.md`, `docs/growth-pattern-library.md`. Soft-fail: KG failures never block the report.

Soft-fail: if the engine fails after Phase 2 intelligence succeeds, the understanding report remains usable and the engine can be retried.

## Modules

| Module | Focus |
| --- | --- |
| Revenue Intelligence™ | Newsletter, membership, products, pricing, upsells, trials, affiliates |
| Authority Intelligence™ | Backlinks, brand mentions, citations, digital PR, partnerships |
| SEO Intelligence™ | Titles, schema, internal links, coverage, depth — always tied to traffic→leads→revenue |
| Content Intelligence™ | Blog, guides, FAQ, case studies, freshness, topical authority |
| Trust Intelligence™ | Testimonials, reviews, guarantees, logos, certifications |
| Conversion Intelligence™ | CTAs, forms, booking, checkout, mobile UX, lead capture |
| Marketing Intelligence™ | Channels, offers, campaigns, lead magnets, funnels |
| Automation Intelligence™ | Email automation, CRM, chat, tracking, booking automation |
| Customer Intelligence™ | Retention loops, segments, onboarding, LTV levers |
| AI Intelligence™ | Missing AI assistants, personalization, AI content/ops leverage |
| Competitive Intelligence™ | Peer-pattern gaps in Phase 3; **Phase 4** deep named-competitor crawl + strategy (`docs/competitive-intelligence.md`) |

## Finding model (shared schema)

Every module returns findings with:

- `moduleId`, `category`, `title`, `detectionStatus`, `summary`
- `whatsMissing`, `whyItMatters`, `businessImpact`
- AI estimates (revenue/leads/traffic/conversion) + `estimateRationale` + `confidence`
- `likelyCauses[]`
- `fixes[]` with tiers: `quick_win` | `medium` | `long_term`
- `priority` / `severity`, `difficulty`, `estimatedTime`, `expectedRoi`
- `opportunityIndex`, `helpfulResources`

## Code map

- `src/lib/analysis/engine/` — orchestrator, modules, scoring, roadmap
- `src/lib/analysis/money-gap-engine.ts` — public entry (calls orchestrator)
- `src/lib/analysis/persist-money-gaps.ts` — DB persistence

## Evolution

Modules must remain independently evolvable. Prefer changing one module file without rewriting the orchestrator.

## Phase 4 Competitive Intelligence™

After the MoneyGap Engine completes, the competitive pipeline discovers and crawls named competitors, profiles them, and writes strategic comparison data for the Competitive tab. Soft-fail and retry are independent of Phase 3. See `docs/competitive-intelligence.md`.
