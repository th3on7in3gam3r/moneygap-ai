# MoneyGap Agency Platform™

## Mission

Help agencies become AI-powered growth consultants.

Agencies manage multiple clients, analyze websites, generate white-label reports, track growth, and collaborate with teams—without rebuilding Engine, Action Center, Advisor, or Monitor.

## Workspace types

- **individual** — default founder workspace (existing behavior)
- **agency** — multi-client consulting
- **enterprise** — agency + higher plan limits

## Agency surfaces

- Agency Profile (name, contact, website)
- Team Members + RBAC
- Clients
- Reports / Projects (reuse existing)
- Brand Settings (white-label)
## Billing

Plan limits UI + entitlements (Phase 8). Stripe Checkout is Phase 9.
- Templates (industry presets—metadata only)

## Clients

CRUD + archive, assign team member, history: reports, MoneyGap Score™ snapshots, completed projects, growth timeline.

Websites may optionally link via `clientId`.

## RBAC roles

`owner` | `admin` | `analyst` | `client_manager` | `viewer`

Legacy `member` maps to `analyst`.

Capabilities: manage clients, run reports, edit recommendations, view billing, manage team, manage brand.

## White-label

Logo, company name, colors, contact, report footer. Reports show:

- Prepared by: Agency Name
- Powered by: MoneyGap AI

Share links: view, print-to-PDF, comment, approve. No email delivery in Phase 7.

## Agency AI Advisor™

Workspace-scoped assistant (separate from report Advisor™). Examples: clients needing attention, monthly improvements, quarterly summaries, common opportunities.

## Scheduled client reports

Weekly / monthly / quarterly in-app reports from Monitor comparisons + snapshots. Cron: `POST /api/cron/agency-reports`.

## Templates

Restaurant, Ecommerce, Local Business, SaaS, Nonprofit, Church—module priority and section hints only. Do not fork MoneyGap Engine™ modules.

## Plans (limits)

Plan limits and entitlements come from the unified monetization catalog (`docs/monetization.md`). Agency features require the `agency` or `enterprise` plan (`agency_workspace`, `white_label_reports`). Stripe Checkout = Phase 9.

## Security

Workspace isolation, RBAC on APIs, tokenized share links, audit logging.

## Code map

- `src/lib/agency/` — permissions, clients, overview, brand, share, advisor, templates, plans, audit
- `/dashboard/clients`, Settings sections, `/share/[token]`
- `/api/clients`, `/api/agency/*`, `/api/share/[token]`, `/api/cron/agency-reports`

## Team Workspace™ (Phase 21)

Secure invites, Client role (`clientId` scope), opportunity comments/approvals, activity/audit UI — see [`team-workspace.md`](./team-workspace.md), [`permissions.md`](./permissions.md), [`client-workspaces.md`](./client-workspaces.md). Composes this Agency platform; does not replace it.

## Out of scope

Public API (shipped Phase 10), Clerk Organizations, Stripe Checkout, email briefs.  
**Growth Marketplace™** catalog ships in Phase 22 ([`marketplace.md`](./marketplace.md)); live creator payouts remain out of scope.
