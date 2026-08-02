# Growth Copilot™

## Mission

MoneyGap AI becomes a trusted strategic partner: understand the business, explain opportunities, recommend actions, and help founders make better growth decisions through conversation.

**Product surface:** [AI Growth Concierge™](./ai-growth-concierge.md) is the logged-in UX built on this Copilot engine (`/dashboard/copilot`).

## Phase

**Phase 19 — MoneyGap AI Growth Copilot™**  
(Brief “Phase 16 Growth Copilot”; Confidence is already Phase 16, Fix Path is Phase 18.)

## Principles

- Soft-fail; enhance shell only (`/dashboard/copilot`, no sidebar redesign).
- Do **not** rewrite Opportunity Index™ / MoneyGap Score™ / Trust / playbook generators.
- Keep report [AI Growth Advisor™](./growth-advisor.md) and [Agency AI Advisor™](./agency-platform.md) separate — Copilot is **workspace-scoped**.
- Compose context from Knowledge Graph™, Industry / Business Model / Pattern intelligence, Integration Hub™, Developer Mode™ / Project Memory™, Confidence Engine™, Automation Engine™, Fix Path Chooser™, Growth OS goals, Executive Briefing™.
- Never auto-publish; estimates are **AI Estimate**; outbound actions require approval (suggest Fix Paths only).

## Surfaces

| Surface | Role |
| --- | --- |
| `/dashboard/copilot` | AI Growth Concierge™ — modes, chat, actions, memory, decisions, plans, reports |
| Business Memory™ | Durable workspace facts (see [`business-memory.md`](./business-memory.md)) |
| Decision Engine™ | Compare options (see [`decision-engine.md`](./decision-engine.md)) |
| Fix Path hints | Copilot replies may deep-link Fix Paths without replacing Action Center |

## Conversation modes

| Mode | Focus |
| --- | --- |
| `ceo` | Priorities, ROI framing, quarterly strategy |
| `marketing` | Demand, content, trust, campaigns |
| `developer` | Implementation, stack, blueprints (via Dev Mode) |
| `agency` | Portfolio / client framing (soft-empty if not agency) |

## Strategic planning & reporting

- Growth plans, priority recommendations, quarterly strategies, implementation roadmaps → `copilot_plans` drafts.
- Weekly / monthly / client reports compose Executive Briefing™ + Monitor briefs — drafts only.

## Guardrails

Every assistant reply carries `meta`: evidence references, confidence, optional `fixPathId`, `requiresApproval` for Hub / Automation / Dev PR suggestions.

## Code map

- `src/lib/copilot/`
- `/api/copilot/*`
- UI: `src/app/dashboard/copilot/page.tsx`

## Related

- [`business-memory.md`](./business-memory.md)
- [`decision-engine.md`](./decision-engine.md)
- [`fix-paths.md`](./fix-paths.md)
- [`executive-briefing.md`](./executive-briefing.md)
- [`growth-advisor.md`](./growth-advisor.md)

## Out of scope

Merging Advisors; sidebar IA; OI rewrite; auto Zapier/CRM send; Neo4j.
