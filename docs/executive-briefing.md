# Executive AI Briefing™

## Mission

Give leadership a recurring rollup of growth progress, priorities, completed improvements, AI recommendations, and automation health—distinct from report-level `executiveBrief` copy and Monitor Weekly Growth Briefs.

## Phase

Part of **Phase 17 — MoneyGap Automation Engine™** (brief “Phase 15”).

## Surfaces

| Surface | Role |
| --- | --- |
| `/dashboard/executive` | Leadership dashboard |
| `executive_briefings` | Durable period snapshots |
| Report `executiveBrief` | Per-report narrative (unchanged) |
| Monitor `growth_briefs` | Website-level weekly brief (composed into briefing payload) |

## Payload

- Weekly progress summary
- Growth / MoneyGap score snapshot
- Top priorities (from Opportunity Queue / Growth OS)
- Completed improvements
- AI recommendations (open high-OI gaps)
- Automation health (workflow drafts/runs, queue depth)

## Principles

- Soft-fail empty when no reports
- Does not rewrite MoneyGap Score™
- Distinct from `/dashboard/enterprise` and `/dashboard/system`

## Code

`src/lib/automation/briefing.ts`

See [`automation-engine.md`](./automation-engine.md).

## Growth Copilot™ (Phase 19)

Copilot executive reporting composes these briefings (and Monitor growth briefs) into weekly/monthly/client **draft** reports—does not replace `/dashboard/executive`. See [`growth-copilot.md`](./growth-copilot.md).
