# Predictive Intelligence™

## Mission

Transform MoneyGap from a reactive analysis platform into a proactive business intelligence system: predict upcoming risks, opportunities, and growth possibilities—so founders see where they are heading tomorrow, not only where they lose money today.

## Phase

**Phase 20 — MoneyGap Predictive Intelligence™**  
(Brief “Phase 17 Predictive Intelligence”; Growth Copilot is Phase 19.)

## Principles

- Soft-fail; never block Monitor cron, Engine, or Phase 2 reports.
- Do **not** rewrite MoneyGap Score™ / Opportunity Index™ / Trust / Monitor cores.
- Estimates are **AI Estimate**; never auto-publish.
- Enhance shell only (`/dashboard/predictive`); no sidebar redesign.
- Distinct from Phase 16 **implementation** Risk Intelligence™ — predictive covers **business / market** risk forecasts.

## Modules

| Module | Role |
| --- | --- |
| Growth Forecasting™ | Score / growth trajectory from snapshots |
| Revenue Prediction Engine™ | Revenue-at-risk and revenue-gap outlook |
| SEO Trend Prediction™ | Discovery/SEO category trends (growth-chain framed) |
| Competitive Movement Intelligence™ | Competitor snapshot fingerprint deltas |
| Business Risk Forecasting | Trust / severity / open-gap risk outlook |
| Opportunity Forecasting™ | Open high-OI gap trajectory |
| Market Signal Detection™ | Lightweight industry / KG soft signals |
| What-If Simulator™ | Quantitative scenario levers (≠ Decision Engine A/B) |
| Predictive Alerts™ | Proactive notifications (`predictive_*`) |

## Prediction contract

Every prediction includes: prediction, evidence, confidence, time horizon, recommended action, kind, and `labeled: "AI Estimate"` for numeric impact.

## Surfaces

| Surface | Role |
| --- | --- |
| `/dashboard/predictive` | Predictive Center™ |
| `workspace_predictions` | Durable forecasts |
| `what_if_scenarios` | Scenario drafts |
| `notifications` | Predictive alert delivery |

## Code map

- `src/lib/predictive/`
- `/api/predictive/*`
- Soft-hook: Monitor `post-process.ts`

## Related

- [`forecasting-engine.md`](./forecasting-engine.md)
- [`prediction-confidence.md`](./prediction-confidence.md)
- [`moneygap-monitor.md`](./moneygap-monitor.md)
- [`risk-intelligence.md`](./risk-intelligence.md)
- [`decision-engine.md`](./decision-engine.md)

## Out of scope

Live SEO rank APIs; full competitor monitoring product; Neo4j; OI rewrite; merging Phase 16 Risk engines.
