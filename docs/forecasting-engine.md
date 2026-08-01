# Forecasting Engine™

## Mission

Compose historical and contextual signals into forward-looking drafts without rewriting scoring cores.

## Phase

Part of **Phase 20 — Predictive Intelligence™**.

## Inputs (soft-fail each)

| Feed | Source |
| --- | --- |
| Historical scores | `score_snapshots`, `analysis_comparisons` |
| Industry / BM / patterns | Knowledge Graph™ classification (soft) |
| Business model cues | Report / Business Memory notes |
| Connected integrations | Integration Hub connection map (soft) |
| Growth patterns | Open opportunities + Growth OS priorities |
| Competitive fingerprints | `competitor_snapshots` |

## Outputs

Workspace predictions (`workspace_predictions`) with the locked prediction contract (evidence, confidence, horizon, action, AI Estimate labels).

## Principles

- Heuristic + trajectory-aware; not a live market data vendor.
- Missing history → lower confidence, still emit cautious drafts.
- Never mutate MoneyGap Score™ or Opportunity Index™.

## Code

`src/lib/predictive/engine.ts` + `forecast-*.ts`

See [`predictive-intelligence.md`](./predictive-intelligence.md).
