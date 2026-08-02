# AI Growth Advisor™ & Action Center™

## Mission

MoneyGap AI does not stop at analysis. It helps founders **implement**.

Discover → Explain → Build → Implement → Grow

## Action Center™

Every MoneyGap finding includes an Action Center with playbook-aware actions:

- **Build This For Me** — generate implementation-ready assets (editable drafts)
- **Learn Why** — expand the six-question finding
- **Save for Later** / **Mark Complete**
- **Create Project** — Action Project™ with checklist
- **Generate Checklist**
- Playbook-specific actions (outreach emails, testimonial requests, backlink campaigns, etc.)

Never auto-publish. Users review and approve everything.

## Generator playbooks

| Playbook | Typical triggers | Generates |
| --- | --- | --- |
| `newsletter` | newsletter, email list | Strategy, lead magnets, landing/form/popup copy, welcome sequence, first 5 issues, automation plan, checklist |
| `faq` | FAQ | 30 Q&As, schema suggestions, publish-ready page |
| `testimonials` | testimonials, reviews, social proof | Request emails, landing section, sample placements |
| `backlinks` | authority, backlinks, guest post | Strategy, guest ideas, outreach + follow-ups, anchors, checklist |
| `lead_magnet` | lead magnet, download | eBook/checklist/template/guide/prompt pack ideas + copy |
| `digital_product` | digital product, course, templates | 10 ideas, positioning, pricing, sales page, launch plan |
| `seo_content` | thin topical / buyer-intent coverage, GEO, long-tail, `moduleId` seo or content | Buyer-Intent Content Pack: keyword shortlist, 90-day calendar, article draft, internal links, FAQ/comparison outline, checklist (drafts only; AI Estimate impact) |
| `site_chatbot` | chatbot, live chat, AI assistant, lead qualify, Intercom/Drift; `moduleId` ai + chat/FAQ language | Site Chatbot Pack: FAQ answer bank, qualify flow, sample transcripts, tool config drafts, checklist (drafts only; AI Estimate impact) |
| `schema_markup` | schema markup, structured data, JSON-LD, rich results, offer/product/service schema | Schema Markup Pack: recommended @types, paste-ready JSON-LD drafts, placement notes, validation checklist (drafts only; AI Estimate impact) |
| `generic` | fallback | Structured implementation pack for the gap |

## Action Projects™

Projects track implementation: status, progress, tasks, estimated completion, business impact, priority.

Statuses: `active` | `paused` | `completed` | `archived`

## AI Growth Advisor™

Report-scoped chat that already knows business, audience, products, Money Gaps, competitors, and recommendations.

Answers must reference report context. Smart follow-up evolves when gaps are marked complete.

## Progress tracking

On the Action tab: projects completed, gaps closed, recommendations implemented, estimated opportunity captured, completion timeline.

## Advisor memory (Phase 6)

Advisor context includes completed/resolved gaps, recent score history, and the latest growth brief so the Advisor does not re-recommend finished work. See `docs/moneygap-monitor.md`.

## Agency AI Advisor™ (Phase 7)

Workspace-scoped assistant for agencies (portfolio questions). **Separate** from report-scoped Advisor™ — do not merge the two. See `docs/agency-platform.md`.

## Code map

- `src/lib/advisor/` — playbooks, checklists, generate, advisor, context
- `/api/reports/[reportId]/…` — opportunities, projects, generate, assets, advisor
- `src/components/action-center/` — Action Center UI + drawers
- Report tabs: **Advisor**, **Action** in `report-view.tsx`

## UX rules

- Expandable drawers for generated assets (editable before save)
- Do not navigate away unnecessarily
- Enhance, do not redesign dashboard chrome

## Growth OS™ (Phase 12)

Growth OS composes Action Center™ + Advisor™ into a daily operating loop:

- **Work On This** enters Execution Mode (focus: task, guidance, checklist, assets)
- Project **dependencies** order recommendations (do not recommend step 4 before step 1)
- Goals bias the AI Priority Engine on the dashboard Overview

See `docs/growth-os.md`. Report Advisor remains separate from Agency Advisor.

## Knowledge Graph™ (Phase 13)

Industry Growth Playbooks (ordered sequences) come from the Knowledge Graph catalog—distinct from Action Center **implementation** playbooks (`newsletter`, `faq`, …). See `docs/knowledge-graph.md`.

## Distinct from Developer Mode™ (Phase 15)

Action Center™ marketing playbooks stay unchanged. **Developer Mode™** (`/dashboard/developer-mode`) produces engineering implementation plans, stack-aware blueprints, and authorized draft PRs—not marketing assets. See `docs/developer-mode.md`.

## Distinct from Automation Engine™ (Phase 17)

Action Center™ playbooks remain marketing/implementation assets. **Automation Engine™** generates executable workflow drafts + Action Projects from the Opportunity Queue and AI Workforce—never auto-publishes. See `docs/automation-engine.md`.

## Fix Path Chooser™ (Phase 18)

Action Center mounts a **How to fix** chooser that routes into Action Center assets, checklists, Developer Mode, Automation Studio, Integration Hub, or Advisor—without replacing playbook generators. See `docs/fix-paths.md`.

## Distinct from Growth Copilot™ (Phase 19)

Report-scoped Advisor™ stays on the report. **Growth Copilot™** (`/dashboard/copilot`) is workspace-scoped Ask MoneyGap™ with Business Memory™, modes, and Decision Engine™—do not merge. See `docs/growth-copilot.md`.
