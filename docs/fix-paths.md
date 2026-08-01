# Fix Path Chooser™

## Mission

When a founder sees a MoneyGap problem and asks **how to fix it**, present clear execution options across the OS—Action Center assets, checklists, Developer Mode / AI blueprints, Automation workflows, Integration Hub, or Advisor—without forcing a single path.

## Phase

**Phase 18 — Fix Path Chooser™**  
(Implementation routing layer after Automation Engine Phase 17.)

## Principles

- Soft-fail; enhance Action Center shell only.
- Do **not** rewrite Opportunity Index™ / MoneyGap Score™ / playbook generators.
- Compose with existing destinations; never auto-publish.
- Recommend a path heuristically; user may choose any path.

## Path catalog

| Id | Label | Destination |
| --- | --- | --- |
| `action_assets` | Build with Action Center | Build This For Me / asset drafts |
| `checklist` | Manual checklist / project | Checklist drawer + Action Project |
| `developer_ai` | Code + AI (Cursor / Claude / …) | IDE Prompt page (`/dashboard/ide-prompt`) — copy prompts; Developer Mode secondary |
| `automation` | Automation workflow | Automation Studio workflow generate |
| `integrations` | Connect tools (Hub) | Integration Hub |
| `advisor` | Ask Growth Advisor | Report Advisor handoff |

## Code map

- `src/lib/fix-paths/` — catalog + recommend
- UI: `opportunity-action-center.tsx` How to fix section
- Automation page reads `?opportunityId=` for generate CTA
- Code + AI → `/dashboard/ide-prompt` (IDE prompts); Developer Mode remains for plans / draft PRs

## Related

- [`growth-advisor.md`](./growth-advisor.md)
- [`growth-copilot.md`](./growth-copilot.md) — Phase 19 may hint Fix Paths from Copilot replies
- [`developer-mode.md`](./developer-mode.md)
- [`automation-engine.md`](./automation-engine.md)
- [`integration-hub.md`](./integration-hub.md)

## Out of scope

Persisting path choice; Zapier runners; sidebar redesign; OI rewrite.
