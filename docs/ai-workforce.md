# AI Workforce™

## Mission

Coordinate specialized AI agents that turn MoneyGap opportunities into agent-scoped workflows and Action Projects—using shared Knowledge Graph™, Industry / Business Model Intelligence™, and Project Memory™.

## Phase

Part of **Phase 17 — MoneyGap Automation Engine™** (brief “Phase 15”).

## Agents

| Agent | Primary Engine modules | Notes |
| --- | --- | --- |
| Revenue Agent™ | `revenue`, `conversion` | Monetization & capture gaps |
| Marketing Agent™ | `marketing`, `content` | Campaigns, nurture, content |
| SEO Agent™ | `seo`, `authority` | Discovery & authority |
| Trust Agent™ | `trust` | Proof, reviews, credibility |
| Automation Agent™ | `automation` | Internal/ops automation gaps |
| Developer Agent™ | (cross-cutting) | Stack-aware via Project Memory™ / Developer Mode |
| Analytics Agent™ | `ai` + analytics cues | Measurement & insight gaps |

## Shared context

Each agent soft-loads (never hard-fails):

- Knowledge Graph classification / rule & pattern hits
- Industry & business-model fit notes
- Project Memory tech profile (Developer Agent especially)
- Confidence Intelligence overall when present
- Integration Hub “automation” connectors (presence only)

## Behavior

Agents are **persona adapters** over existing opportunity data—not new scoring engines. They assign queue items, shape workflow steps, and appear in Automation Studio™.

## Code

`src/lib/automation/agents.ts`, `context.ts`

See [`automation-engine.md`](./automation-engine.md).
