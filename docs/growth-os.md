# MoneyGap Growth OS™

## Mission

MoneyGap AI evolves from a business intelligence platform into a **Business Growth Operating System**—the place founders open every morning to know exactly what to work on next.

Discover → Prioritize → Generate → Execute → Track → Measure.

## Phase

**Phase 12 — MoneyGap Growth OS™**  
(Stripe remains Phase 9; API remains Phase 10; Trust remains Phase 11.)

## Principles

- **Enhance, do not redesign** dashboard shell, nav, or report chrome.
- **Compose, do not rebuild** Engine, Advisor, Action Center, Monitor, Agency, API, Billing, or Trust.
- Growth OS lives primarily on **dashboard Overview** (mission control).
- Report Action Center gains **Work On This → Execution Mode**.
- Soft-fail hooks only; never block Phase 2 intelligence.

## Growth Workspace surfaces

| Surface | Role |
| --- | --- |
| Today Dashboard | Personalized focus, Top 3, coach nudges |
| Business Goals | User-defined targets that bias priorities |
| Opportunity Portfolio | Investment rollup ($ estimated / completed / in progress / remaining) |
| AI Priority Engine | Top 3 today from goals, difficulty, ROI, deps, progress |
| Project Dependencies | Ordered chains; never recommend step 4 before step 1 |
| Execution Mode | Distraction-free work: task, guidance, checklist, assets |
| AI Business Coach | Proactive nudges from briefs, delays, score proximity |
| Achievements | Business milestones unlocked by progress |
| Success Metrics | Projects, score growth, captured $, improvements, time saved |
| Business Timeline | Milestone feed over months |
| Growth Calendar | Realistic weekly plan (not 40 dumped ideas) |

## Goals taxonomy

`leads` · `revenue` · `product` · `subscribers` · `seo` · `authority` · `conversions` · `custom`

Each recommendation should support at least one active goal when goals exist.

## Priority factors

1. Goal alignment  
2. Opportunity Index™ / ROI  
3. Difficulty (prefer unfinished easy wins when stuck)  
4. Dependencies (skip blocked)  
5. Progress (near-complete projects bubble up)

## Portfolio math

- **Estimated Annual Opportunity** — sum of open + in-progress + completed estimates on latest reports  
- **Completed** — lifecycle completed / improved / resolved  
- **In Progress** — implementation or lifecycle in progress  
- **Remaining** — not completed

## Code map

- `src/lib/growth-os/` — goals, portfolio, priority, deps, today, coach, achievements, timeline, calendar, metrics
- `src/components/growth-os/` — Overview panels
- `src/app/dashboard/page.tsx` — Growth Workspace / Today
- `src/app/dashboard/goals/page.tsx` — Goals management
- APIs: `/api/goals`, project dependencies, `/api/growth-os/today`
- Execution Mode: report `?focus=` + Action Center

## Out of scope

Stripe, Analytics sample rebuild, full drag-drop calendar, Opportunity Index formula rebuild, new sidebar IA, merging report Advisor with Agency Advisor.

## Related

**Phase 17 Automation Engine™** composes Today priorities and calendar into Opportunity Queue™ / Sprint Planner™ without rebuilding Growth OS cores. See `docs/automation-engine.md`.
