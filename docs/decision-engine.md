# Decision Engine™

## Mission

Help founders compare strategic options with evidence, confidence, and clear next steps—without auto-executing changes.

## Phase

Part of **Phase 19 — Growth Copilot™**.

## Examples

- Hiring vs automation
- Marketing vs development investment
- Feature A vs Feature B

## Flow

1. User supplies options (+ optional criteria).
2. Engine scores options against workspace context (gaps, goals, confidence, stack, Hub).
3. Returns comparison, recommendation, evidence, confidence, and Fix Path hint.
4. Status stays `draft` until user approves (record only—no outbound publish).

## Guardrails

- Explainability: cite evidence from context notes / opportunities.
- Confidence score on the recommendation.
- `requiresApproval: true` for any Hub / Automation / Dev Mode action.
- Labels remain **AI Estimate** where impact is projected.

## Schema

`decision_simulations` — options jsonb, criteria, result payload, status `draft` | `approved`.

## Code

`src/lib/copilot/decision.ts` · `POST /api/copilot/decisions`

See [`growth-copilot.md`](./growth-copilot.md) and [`fix-paths.md`](./fix-paths.md).

## Distinct from What-If Simulator™ (Phase 20)

Decision Engine compares **strategic options** (hiring vs automation). **What-If Simulator™** projects **quantitative** levers (conversion %, traffic, pricing) under Predictive Intelligence™. Do not merge. See [`predictive-intelligence.md`](./predictive-intelligence.md).
