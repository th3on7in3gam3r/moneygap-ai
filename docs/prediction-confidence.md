# Prediction Confidence™

## Mission

Score how trustworthy a **forward** prediction is, based on evidence density and history depth—distinct from Phase 16 Confidence Center™ (recommendation / implementation confidence).

## Phase

Part of **Phase 20 — Predictive Intelligence™**.

## Factors

| Factor | Effect |
| --- | --- |
| Snapshot count / depth | More history → higher confidence |
| Evidence item count | More cited signals → higher confidence |
| Feeder soft-fail notes | Missing Hub / CI / KG → lower confidence |
| Horizon length | Longer horizons (90d) slightly lower confidence |

## Range

0–100 integer on each prediction. Numeric impacts remain **AI Estimate**.

## Distinct from

| System | Scope |
| --- | --- |
| Confidence Center™ (Phase 16) | Per-opportunity business/dev/data/benchmark/AI confidence |
| Prediction Confidence™ (Phase 20) | Forecast reliability for predictive artifacts |

## Code

`src/lib/predictive/confidence.ts`

See [`predictive-intelligence.md`](./predictive-intelligence.md) and [`confidence-engine.md`](./confidence-engine.md).
