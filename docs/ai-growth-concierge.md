# AI Growth Concierge™

## Mission

AI Growth Concierge™ is an experienced growth consultant embedded in MoneyGap: product guide, business advisor, navigation assistant, and execution companion.

It educates, guides, recommends, and helps users **take action** — not a generic website FAQ chatbot.

## Relationship to other AI surfaces

| Surface | Role |
| --- | --- |
| **AI Growth Concierge™** | Logged-in dashboard companion (`/dashboard/copilot`) — navigation, Fix Paths, insights |
| **Growth Copilot™** | Engine under Concierge (modes, Business Memory™, decisions, plans) — see [`growth-copilot.md`](./growth-copilot.md) |
| **AI Growth Advisor™** | Report-scoped Action Center chat — keep separate ([`growth-advisor.md`](./growth-advisor.md)) |
| **Agency AI Advisor™** | Agency portfolio advisor — keep separate |
| **`site_chatbot` playbook** | Draft packs for *customers’* sites — not MoneyGap’s own widget |

## Phase 1 surfaces

- Sidebar: **Growth Concierge** → `/dashboard/copilot`
- Chat with safety labels: **Verified** · **Recommendation** · **AI Estimate**
- Proposed actions (confirm to navigate — never auto-execute):
  - Smart navigation (Reports, Money Gaps, Integrations, Scan, Academy, …)
  - Open report (focused opportunity when available)
  - Recommend Fix Path™
- Proactive **Insights** strip from Growth OS coach nudges (soft-fail empty)
- Session memory = current thread + Business Memory™

## Safety

- Never fabricate scan results or scores
- Distinguish Verified findings vs Recommendations vs AI Estimates
- Outbound / Hub / automation suggestions require confirmation
- Never auto-publish to CRM, email, or production

## Feature flag

`FEATURE_GROWTH_COPILOT` — omit/unset = enabled; `0` / `false` / `off` disables Concierge + Copilot engine.

## Phase 2 (later)

- Public marketing Concierge (product / pricing / Academy / demo → signup) — still not a FAQ bot
- Confirmed tools: create project, metadata drafts, schema pack, blog draft
- Concierge-owned alerts from predictive + monitor
