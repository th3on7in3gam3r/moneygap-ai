# MoneyGap Knowledge Graph™ & Industry Intelligence™

## Mission

MoneyGap AI should not rely solely on large language models. A proprietary **Knowledge Graph** is the intelligence foundation for Industry Intelligence, Benchmarking, and Recommendation improvements—so advice feels like a seasoned industry consultant, not a generic chatbot.

## Phase

**Phase 13 — MoneyGap Knowledge Graph™ & Industry Intelligence™**  
**Phase 13.1 — Knowledge Graph™ Foundation** (brief label “Phase 11.1”; Trust remains Phase 11; Growth OS remains Phase 12.)  
**Phase 13.2 — Industry Intelligence™ Engine** (brief label “Phase 11.2”) — see [`industry-intelligence.md`](./industry-intelligence.md).  
**Phase 13.3 — Business Model Intelligence™** (brief label “Phase 11.3”) — see [`business-model-intelligence.md`](./business-model-intelligence.md).  
**Phase 13.4 — Growth Pattern Library™** (brief label “Phase 11.4”) — see [`growth-pattern-library.md`](./growth-pattern-library.md).

## Principles

- Soft-fail: KG never blocks Phase 2 intelligence reports.
- Additive: classifies early for Engine context; wraps Engine output with rules and soft priority modifiers.
- Does **not** rewrite Opportunity Index™ formula weights.
- Does **not** rebuild Engine, Advisor, Monitor, Agency, API, Billing, Trust, or Growth OS cores.
- Expandable: new industries, patterns, rules, recommendations, and playbooks via catalog + Admin Knowledge Center.

## Entity taxonomy (Foundation)

| Brief entity | Storage |
| --- | --- |
| Industry | `kg_industries` |
| Business Model | `kg_business_models` |
| Growth Pattern | `kg_patterns` |
| Revenue Strategy | `kg_entities` type `revenue_strategy` |
| Trust Signal | `kg_entities` type `trust_signal` |
| Conversion Strategy | `kg_entities` type `conversion_strategy` |
| Marketing Channel | `kg_entities` type `marketing_channel` |
| SEO Strategy | `kg_entities` type `seo_strategy` |
| Automation Strategy | `kg_entities` type `automation_strategy` |
| Technology Pattern | `kg_entities` type `technology_pattern` |

Also cataloged: Rules (`kg_rules`), Industry Playbooks (`kg_playbooks`), Recommendations (`kg_recommendations`).

## Versioning

Every knowledge entry supports:

| Field | Meaning |
| --- | --- |
| `createdAt` | First insert |
| `updatedAt` | Last mutation |
| `version` | Entry semver string (default `1.0.0`) |
| `status` | `active` \| `draft` \| `deprecated` |

Catalog-level stamps live in `kg_versions` (e.g. `1.1.0` Foundation).

## Recommendations

First-class, admin-managed recommendation rows (distinct from rules/playbooks): industry/model/pattern/module refs, summary/body, priority, version, status. Active recommendations feed Engine KG context and Admin Knowledge Center.

## Classification

Map free-text `industry` / `businessModel` → taxonomy slugs with confidence + signals. Persist in `website_classifications`.

## Engine integration

1. **Generation-time:** classify early → build compact `kgContext` (industry profile, patterns, active recommendations) → pass into `EngineContext` so modules reference proprietary guidance while generating findings.
2. **Post-engine:** rules + soft priority scoring + playbook snapshot (does not change Opportunity Index™ internals).

## Pipeline order

Classify early → Engine (with KG context) → **KG rules / soft-score / playbook** → Trust Engine → persist.

## Admin Knowledge Center

`/dashboard/knowledge` (Settings-linked, no sidebar item): Industries, Patterns, Rules, Recommendations, Playbooks, Versions. Owner/admin can toggle status (and rule enabled).

## Code map

- `src/lib/knowledge-graph/` — taxonomy, classify, context, recommendations, rules, scoring, playbooks, ensure, admin
- Wired in `persist-money-gaps.ts`
- Report: Industry Growth Playbook section
- Admin: `/dashboard/knowledge` + `/api/knowledge/*`

## Expandability

Add industries/entities/patterns/rules/recommendations via seed + ensure; bump `KNOWLEDGE_GRAPH_VERSION`; Admin toggles status without redeploy. Future: Benchmarking graphs, outcome learning, public KG API (deferred).

## Out of scope

Neo4j, ML outcome learning, Opportunity Index rewrite, public KG API, sidebar redesign, full create-forms for every entity.
