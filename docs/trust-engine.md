# Trust Engine™

## Mission

Validate and explain MoneyGap findings before they are shown to founders—so every recommendation answers: **Why should I trust this? How was this determined? What should I do next?**

## Phase

**Phase 11** — Trust Engine™ & Production Readiness  
(Stripe remains Phase 9; API remains Phase 10.)

## Principles

- Soft-fail: Trust never blocks Phase 2 intelligence reports.
- Additive: wraps Engine output; does not rebuild orchestrator modules.
- Explainable: confidence level, evidence, supporting signals, business reasoning, detection source.
- False-positive aware: merge overlaps; suppress contradictory recommendations (e.g. “add newsletter” when one is found).

## Confidence model

Scalar `confidence` 0–100 remains. Derived `confidenceLevel`:

| Level | Score |
| --- | --- |
| `very_high` | ≥ 90 |
| `high` | ≥ 75 |
| `medium` | ≥ 55 |
| `low` | &lt; 55 |

Factors (stored in `trustMeta.factors`): detection quality, data completeness, industry confidence, AI certainty.

## Evidence fields (additive)

- `evidenceSummary`
- `supportingSignals[]`
- `businessReasoning`
- `detectionSource` (e.g. `module:marketing`)
- `confidenceLevel`
- `trustMeta` — `{ factors, suppressed, mergedFrom, qaFlags }`

## QA pipeline

Pre-publish checks: duplicates, missing explanations/fixes, empty sections, invalid estimates, score sanity. Soft-fix or suppress; never hard-crash the report.

## Code map

- `src/lib/trust/` — confidence, evidence, dedupe, qa, validate
- Wired in `persist-money-gaps.ts` after Engine run
- UI: `opportunity-card.tsx` + report overview trust summary
- Flags: `FEATURE_TRUST_ENGINE`, `MAINTENANCE_MODE`

## Related

**Phase 16 Confidence & Implementation Intelligence™** extends Trust with five named confidence engines, Risk/Impact/Validation, and Confidence Center™ — without rewriting Trust or Opportunity Index™. See `docs/confidence-engine.md`.

## Out of scope

Stripe Checkout, full APM, Opportunity Index™ formula rebuild.
