# Confidence & Implementation Intelligence™

## Mission

Build the trust layer between analysis and implementation so every recommendation includes why it matters, confidence, risk, estimated impact, supporting evidence, and a validation checklist—giving founders confidence to act.

## Phase

**Phase 16 — Confidence & Implementation Intelligence™**  
(Brief label “Phase 14 (Confidence)”. Developer Mode = Phase 15 / brief 13; Integration Hub = Phase 14 / brief 12; Trust Engine = Phase 11.)

## Principles

- Soft-fail; never block Phase 2 reports or Engine runs.
- Additive on Trust Engine™ — does **not** rebuild Trust or rewrite Opportunity Index™ / MoneyGap Score™.
- Impact values are always labeled **estimated**.
- Compose with Knowledge Graph™ (`kgMeta`) and optional Project Memory™ (Developer Mode).

## Five confidence engines

| Engine | Role |
| --- | --- |
| Business Confidence™ | Business-model / category fit and business reasoning |
| Developer Confidence™ | Project Memory / stack readiness (soft-low if missing) |
| Data Confidence™ | Detection quality and data completeness (Trust factors) |
| Benchmark Confidence™ | Industry / BM / pattern benchmark context from KG |
| AI Confidence™ | Model certainty minus QA penalties |

Each produces 0–100. **Overall** = weighted blend (does not change OI).

## Confidence Center™

`/dashboard/confidence` — overall score, engine breakdown, history snapshots, per-recommendation list, low-confidence callouts.

## Related engines

- Risk Engine™ — see [`risk-intelligence.md`](./risk-intelligence.md)
- Impact Engine™ — estimated revenue / SEO / trust / conversion / authority / automation
- Explainability — see [`explainability.md`](./explainability.md)
- Validation Engine™ — implementation checklists (distinct from Trust pre-publish QA)

## Code map

- `src/lib/confidence/` — engines, risk, impact, explain, validation, enrich, snapshots
- Wired soft-fail in `persist-money-gaps.ts` after Trust
- Tables: `confidence_intel` on opportunities + `workspace_confidence_snapshots`
- APIs: `/api/confidence`
- Flag: `FEATURE_CONFIDENCE_INTEL` (default on; `0` skips)

## Related

- [`trust-engine.md`](./trust-engine.md) — Phase 11 foundation
- [`risk-intelligence.md`](./risk-intelligence.md)
- [`explainability.md`](./explainability.md)

## Out of scope

OI/Score rewrite; Trust rebuild; live CI; autonomous validation runners; Neo4j; sidebar redesign.
