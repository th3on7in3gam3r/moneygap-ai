# Risk Intelligence™

## Mission

Evaluate implementation risk for each MoneyGap recommendation so founders and developers know what could break and how hard rollback is—before they authorize work.

## Phase

Part of **Phase 16 — Confidence & Implementation Intelligence™** (brief “Phase 14”).

## Distinct from Predictive business risk (Phase 20)

This doc covers **implementation** risk on opportunities. Phase 20 **Business Risk Forecasting** under Predictive Intelligence™ forecasts market/trust/severity outlooks—do not merge. See [`predictive-intelligence.md`](./predictive-intelligence.md).

## Dimensions (0–100 risk scores)

| Dimension | Signals |
| --- | --- |
| Breaking changes | High difficulty, core module (auth, payments, schema) |
| Deployment risk | Hosting-sensitive changes; unknown stack raises score |
| Database risk | Modules/categories touching data, ORM, migrations |
| Security impact | Auth, payments, PII-adjacent categories |
| Rollback complexity | High when multi-layer + no Project Memory |

Overall **risk level**: `low` | `medium` | `high` from average of dimensions.

## Output

Stored on `confidenceIntel.risk` with a short `summary`. Surfaces on opportunity cards and Confidence Center™.

## Distinct from

- Developer Mode plan `riskLevel` (implementation-plan scoped)
- Trust Engine QA (pre-publish finding quality)
- Phase 20 **Business Risk Forecasting** under Predictive Intelligence™ (market/trust outlook — do not merge). See [`predictive-intelligence.md`](./predictive-intelligence.md).

## Code

`src/lib/confidence/risk.ts`

See [`confidence-engine.md`](./confidence-engine.md).
