# Explainability™

## Mission

Every recommendation should show *why* it exists: supporting evidence, benchmark context, Knowledge Graph rules, business-model reasoning, and industry reasoning.

## Phase

Part of **Phase 16 — Confidence & Implementation Intelligence™** (brief “Phase 14”).

## Surfaces

| Field | Source |
| --- | --- |
| Evidence | Trust `evidenceSummary` / `supportingSignals` |
| Benchmark context | Industry / BM / pattern fit notes from `kgMeta` |
| KG rules | `kgMeta.ruleHits` / `patternHits` |
| Business model reasoning | `businessReasoning` + BM fit notes |
| Industry reasoning | Industry fit notes + classification |

Assembled into `confidenceIntel.explainability` and shown on cards / Confidence Center.

## Principles

- Prefer persisted Trust + KG fields; do not invent unsupported claims.
- Soft-fail empty sections when KG or Trust enrichment was skipped.
- Complements Trust Engine™ card copy; does not replace it.

## Code

`src/lib/confidence/explain.ts`

See [`confidence-engine.md`](./confidence-engine.md), [`trust-engine.md`](./trust-engine.md).
