# MoneyGap Automation Engine™ & AI Workforce™

## Mission

Transform MoneyGap AI from a recommendation platform into an **execution platform**: recommendations become workflows, sprints, agent assignments, and recurring optimization—without auto-publishing to CRM or email.

## Phase

**Phase 17 — MoneyGap Automation Engine™ & AI Workforce™**  
(Brief label “Phase 15 (Automation Engine)”. Confidence = Phase 16 / brief 14; Developer Mode = Phase 15 / brief 13.)

## Principles

- Soft-fail; never block Phase 2 reports, Engine, or Monitor cron.
- Compose with Growth OS™, Action Center™, Monitor™, Knowledge Graph™, Project Memory™, Confidence Intelligence™.
- Do **not** rewrite Opportunity Index™ / MoneyGap Score™ / Trust / Growth OS Priority Engine.
- Never auto-publish; workflows create Action Projects™ and draft steps only.
- Automation Marketplace™ = curated internal templates (sourced into Phase 22 Growth Marketplace™; not a paid app-store).

## Core modules

| Module | Role |
| --- | --- |
| Automation Studio™ | `/dashboard/automation` — queue, agents, workflows, sprints, marketplace |
| AI Workflow Generator™ | Structured steps from opportunities |
| AI Sprint Planner™ | Weekly plan from Opportunity Queue |
| Opportunity Queue™ | Prioritized work items assigned to agents |
| Continuous Optimization™ | Monitor compare → refresh queue |
| Executive AI Briefing™ | Leadership rollup at `/dashboard/executive` |
| Automation Marketplace™ | Curated workflow templates |
| AI Workforce™ | Seven specialized agents — see [`ai-workforce.md`](./ai-workforce.md) |

## Security

- Owner/admin for mutations
- Feature flag `FEATURE_AUTOMATION_ENGINE` (default on; `0` skips soft hooks)
- No direct CRM/email sends; Integration Hub remains connect-only for automation vendors

## Code map

- `src/lib/automation/` — agents, queue, workflows, sprints, optimize, briefing, marketplace, studio
- `src/app/api/automation/` — Studio APIs
- Tables: `automation_*`, `executive_briefings`

## Related

- [`ai-workforce.md`](./ai-workforce.md)
- [`executive-briefing.md`](./executive-briefing.md)
- [`growth-os.md`](./growth-os.md), [`moneygap-monitor.md`](./moneygap-monitor.md), [`growth-advisor.md`](./growth-advisor.md)
- [`fix-paths.md`](./fix-paths.md) — Phase 18 routes “Automation workflow” here from opportunities
- [`marketplace.md`](./marketplace.md) — Phase 22 Growth Marketplace™ catalogs these templates as `automation_recipes`

## Out of scope

Live Zapier/Make runners; auto-publish; OI/Score rewrite; Neo4j; sidebar redesign. Public Growth Marketplace™ catalog = Phase 22 (does not replace this internal template store).
