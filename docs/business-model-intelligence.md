# Business Model Intelligence™

## Mission

MoneyGap AI must understand not only **what** a company does (industry), but **how it makes money** (business model)—and where revenue opportunities are lost in that architecture.

## Phase

**Phase 13.3 — Business Model Intelligence™**  
(Brief label “Phase 11.3”. Industry Intelligence = 13.2; Knowledge Graph Foundation = 13.1.)

## Principles

- Soft-fail; never block Phase 2 reports.
- Additive on Knowledge Graph™ — composes with Industry Intelligence™.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™ formula weights.
- User can override detected business model.
- Ecommerce **industry** (`ecommerce`) stays distinct from Ecommerce **model** (`product_commerce`).

## Architecture

```
Intelligence + corpus → BM detection (evidence) → Business Model Profile
        ↓                         ↓
  Engine kgContext         Revenue Architecture stages
        ↓                         ↓
 Soft BM priority boosts → BM Gap / benchmark snapshot → Report UI
```

## Detection signals

Pricing pages, checkout/cart, product pages, membership CTAs, registration, payment language, donate/give, ads/CPM, marketplace language, lead/quote CTAs, subscribe language.

Returns: `businessModelSlug`, confidence, `modelEvidence[{ signal, weight }]`, `source` (`auto` | `override`).

## Profile schema

Each `kg_business_models.profile` includes:

| Field | Role |
| --- | --- |
| `revenueStructure` | How money is collected |
| `customerJourney` | High-level journey labels |
| `growthLevers` | What moves revenue |
| `commonGaps` | Frequent missing pieces |
| `trustRequirements` | Proof needed to convert |
| `conversionPatterns` | Typical conversion paths |
| `retentionStrategies` | Keep / expand |
| `revenueStages` | Ordered funnel for architecture viz |
| `benchmarks.expectedCapabilities` | Peer checklist |

## Revenue architecture

Ordered stages (example SaaS-style): Visitor → Lead → Trial → Customer → Retention → Expansion.

Each stage marked `present` | `weak` | `missing` from corpus + findings. Persisted as `reports.revenueArchitecture`.

## Revenue Gap Engine

Compares site vs BM profile + Knowledge Graph patterns + findings:

- Missing capabilities
- Peer patterns
- Priority opportunities
- `businessModelFitScore` (0–100 soft fit — **not** MoneyGap Score™)

Persisted as `reports.businessModelGapReport`.

## Soft scoring

BM `commonGaps` / missing stages may soft-boost finding `priorityScore`. Formula weights unchanged. See `docs/scoring-system.md`.

## Report UI

- **How You Make Money** — vertical revenue stage flow
- **Compared To Your Business Model** — benchmarks + override

## Admin

Knowledge Center → Business Models: view profiles, edit benchmarks, toggle status.

## Code map

- `src/lib/knowledge-graph/classify.ts` — BM detection + evidence
- `src/lib/knowledge-graph/business-model-gaps.ts` — architecture + gap snapshots
- `src/lib/knowledge-graph/scoring.ts` — soft BM modifiers
- Wired in `persist-money-gaps.ts` / `runKnowledgeGraphPass`
- Report: `report-view.tsx`
- API: `/api/reports/[reportId]/classification`, `/api/knowledge/business-models/[slug]`

## Future expansion

Live peer cohorts from Monitor data; multi-model hybrid scoring; public BM API. Out of scope for 13.3: Neo4j, OI rewrite, sidebar redesign.

## Related

- [`growth-pattern-library.md`](./growth-pattern-library.md) — Phase 13.4 Growth Pattern Library™
