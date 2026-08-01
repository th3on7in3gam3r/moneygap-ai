# Growth Pattern Library™

## Mission

MoneyGap AI should move beyond listing missing features. It recommends **proven growth strategies**—reusable patterns matched to industry, business model, detected gaps, goals, and maturity.

## Phase

**Phase 13.4 — Growth Pattern Library™**  
(Brief label “Phase 11.4”. Foundation = 13.1; Industry Intelligence = 13.2; Business Model Intelligence = 13.3.)

## Principles

- Soft-fail; never block Phase 2 reports.
- Additive on Knowledge Graph™ — composes with Industry + Business Model Intelligence™.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™ formula weights.
- Patterns are catalog entities; matching is deterministic and explainable (confidence + reasoning).
- Categories are a taxonomy enum (not a separate CRUD table). Admin stays enhance-only (status + profile edits).

## Architecture

```
Industry + BM classify → Pattern Matching Engine → Recommended patterns
        ↓                         ↓                        ↓
 Workspace goals           Growth Playbooks          Soft priority boosts
 Findings + maturity              ↓                        ↓
                         Engine kgContext  →  Report UI (patterns + playbook)
```

## Pattern categories

| Category | Role |
| --- | --- |
| `revenue` | Monetization and expansion |
| `acquisition` | Demand capture |
| `seo` | Organic discovery |
| `authority` | Proof and inbound trust |
| `trust` | Credibility signals |
| `conversion` | Turn attention into action |
| `retention` | Keep and expand customers |
| `automation` | Scale ops and nurture |
| `ai_adoption` | AI-assisted growth loops |

## Pattern schema

Each `kg_patterns` row includes `category`, `description`, and `profile`:

| Field | Role |
| --- | --- |
| `applicableIndustries` | Empty = all; otherwise filter |
| `applicableBusinessModels` | Empty = all; otherwise filter |
| `requiredConditions` | Corpus / finding cues that unlock |
| `maturityLevels` | `early` \| `growth` \| `scale` |
| `goalTypes` | Maps to Growth OS `business_goals.type` |
| `implementationSteps` | Ordered how-to |
| `impactScore` | Soft impact 1–100 |
| `revenuePotential` | Soft 1–5 |

Existing fields remain: `purpose`, `outcomes`, `dependencies`, `difficulty`, `roiEstimate`, `relatedEntitySlugs`.

## Matching logic

Inputs: industry, business model, MoneyGap findings, workspace goals, maturity heuristic, corpus.

Per active pattern, confidence (0–100) aggregates industry fit, BM fit, condition hits, goal overlap, maturity overlap, and finding/entity hits. Patterns with an industry or BM allow-list that does not match are excluded.

Output: ranked recommendations with confidence, reasoning strings, impact, difficulty, and step previews. Persisted as `reports.patternMatchReport`.

**Maturity** (soft, no table): derived from finding density and gap severity (`early` / `growth` / `scale`).

## Growth playbooks

A playbook combines ordered steps (and optional `patternSlugs`) into a strategy for an industry and optionally a business model. Examples: SaaS, Ecommerce, Local Business, Nonprofit.

Resolved after matching; shown on the report alongside recommended patterns.

## Soft scoring

Matched patterns may soft-boost finding `priorityScore` when findings close pattern conditions / related entities. Sets `kgMeta.patternFitNote`. Formula weights unchanged. See `docs/scoring-system.md`.

## Report UI

- **Recommended Growth Patterns** — ranked cards with category, confidence, reasoning
- **Industry Growth Playbook** — steps linked to library pattern names when `patternSlug` resolves

## Admin

Knowledge Center → Patterns (category filter, profile/impact edits, status) and Playbooks (status, pattern composition). Rules remain enable/disable. No full create-forms CMS.

## Code map

- `src/lib/knowledge-graph/pattern-match.ts` — matching engine
- `src/lib/knowledge-graph/playbooks.ts` — playbook resolve
- `src/lib/knowledge-graph/scoring.ts` — soft pattern modifiers
- `src/lib/knowledge-graph/context.ts` — matched patterns in Engine context
- Wired in `persist-money-gaps.ts` / `runKnowledgeGraphPass`
- Report: `report-view.tsx`
- API: `/api/knowledge/patterns/[slug]`, `/api/knowledge/playbooks/[slug]`

## Future expansion

Learned pattern efficacy from Monitor outcomes; multi-site cohort ranking; public Patterns API.  
**Verified Growth Patterns™** (observed trends surface) = Phase 22 — see [`growth-patterns.md`](./growth-patterns.md).

Out of scope for 13.4: Neo4j, ML ranking, OI rewrite, sidebar redesign, separate `kg_categories` table.
