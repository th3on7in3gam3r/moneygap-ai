# Industry Intelligence™ Engine

## Mission

MoneyGap AI must feel like an experienced consultant who understands the user’s **specific industry**. A SaaS company, restaurant, nonprofit, creator, and ecommerce brand should receive different recommendations, priorities, and gap framing.

Industry Intelligence™ sits on the Knowledge Graph™ Foundation and adapts recommendations, soft scoring context, benchmarks, and report narrative by industry.

## Phase

**Phase 13.2 — Industry Intelligence™ Engine**  
(Brief label “Phase 11.2”. Trust = 11; Growth OS = 12; Knowledge Graph Foundation = 13.1.)

## Principles

- Soft-fail: never block Phase 2 reports.
- Additive: enrich profiles, classification, gap snapshot, and soft priority modifiers.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™ formula weights.
- User can **override** detected industry.
- Expandable via Admin Knowledge Center + catalog seeds.

## Architecture

```
Website Intelligence → Classify (+ override) → Industry Profile
        ↓                      ↓
   Engine (kgContext)    Industry Gap Snapshot
        ↓                      ↓
 Soft priority modifiers → Persist → Report (“Compared To Your Industry”)
```

## Industry profile schema

Each `kg_industries.profile` includes:

| Field | Role |
| --- | --- |
| `description` | Plain-language industry brief |
| `characteristics` | How these businesses typically operate |
| `revenueModels` | Monetization patterns |
| `growthPriorities` / critical growth areas | What to optimize first |
| `commonGaps` | Frequent missing capabilities |
| `trustSignals` | Expected proof |
| `conversionPatterns` | How peers convert |
| `seoExpectations` | Search / visibility norms |
| `marketingChannels` | Typical acquisition |
| `integrations` | Recommended stack |
| `websiteFeatures` | Expected site capabilities |
| `benchmarks.expectedFeatures` | Capability checklist for gap scoring |
| `benchmarks.peerCategoryTargets` | Soft category expectations (context only) |
| `benchmarks.notes` | Analyst notes |

## Classification

Signals: intelligence industry/model fields, overview, products/services, plus light corpus cues (pricing, cart, donate, sermon, subscribe, etc.).

Returns: `industrySlug`, `businessModelSlug`, `confidence`, `signals`, `source` (`auto` | `override`).

Overrides persist on `website_classifications` and are respected on KG pass / gap rebuild.

## Soft scoring (not formula rewrite)

Industry expectation gaps and `commonGaps` may **soft-boost** finding `priorityScore` after Engine scoring. MoneyGap Score™ internals stay unchanged. An additive **industryFitScore** (0–100) on the gap snapshot measures fit vs peer expectations — separate from MoneyGap Score™.

## Industry Gap Report

Persisted on `reports.industryGapReport` and rendered as **Compared To Your Industry**:

- Industry benchmark summary
- Missing capabilities
- Peer / competitor patterns (from profile expectations)
- Priority opportunities (matched to findings)
- Override control

## Recommendation flow

1. Classify (or override) industry.
2. Load profile + KG patterns / recommendations into Engine `kgContext`.
3. Engine generates findings with industry context.
4. Rules + soft industry scoring adjust priorities.
5. Gap snapshot + playbook attach to report.
6. UI surfaces industry-specific narrative and priorities.

## Admin

Knowledge Center (`/dashboard/knowledge`): manage industries (profile + benchmarks), patterns, rules, recommendations. Owner/admin can PATCH industry profile fields.

## Code map

- `src/lib/knowledge-graph/classify.ts` — detection + override apply
- `src/lib/knowledge-graph/industry-gaps.ts` — gap snapshot builder
- `src/lib/knowledge-graph/scoring.ts` — soft priority modifiers
- `src/lib/knowledge-graph/context.ts` — Engine guidance pack
- Wired in `persist-money-gaps.ts`
- Report: `report-view.tsx` Compared To Your Industry
- API: `/api/reports/[reportId]/classification`, `/api/knowledge/industries/[slug]`

## Related

- [`knowledge-graph.md`](./knowledge-graph.md) — proprietary intelligence foundation
- [`business-model-intelligence.md`](./business-model-intelligence.md) — Phase 13.3 revenue-model layer
- [`growth-pattern-library.md`](./growth-pattern-library.md) — Phase 13.4 reusable growth strategies

## Future expansion

More industries, live peer benchmarks from Monitor data, ML calibration of fit scores, public Industry Intelligence API. Out of scope for 13.2: Neo4j, OI rewrite, sidebar redesign.
