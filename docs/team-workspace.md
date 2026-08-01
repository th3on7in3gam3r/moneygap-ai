# MoneyGap Team Workspace™ & Enterprise Collaboration™

## Mission

Make MoneyGap the central collaboration system where organizations manage growth opportunities, teams, projects, and implementations using MoneyGap intelligence.

## Phase

**Phase 21 — Team Workspace™ & Enterprise Collaboration™**  
(Brief “Phase 18 Team Workspace”; Predictive Intelligence is Phase 20.)

## Principles

- Soft-fail behind `FEATURE_TEAM_WORKSPACE` (default on unless `=0`).
- **Compose** Agency Platform™ (Phase 7), share links, Automation sprints, and Executive Briefing™ — do not rebuild those cores.
- **One tenant:** clients join the existing organization workspace via secure invite tokens. No separate client workspaces yet (`clientId` scoping prepares future multi-tenant expansion).
- Enhance shell only; no sidebar redesign; no Score / Opportunity Index rewrite.

## Modules

| Module | Approach |
| --- | --- |
| Organization Management™ | Settings + `/dashboard/team` hub |
| Team Members™ | Agency team APIs + invite tokens |
| Roles & Permissions™ | Extended Agency RBAC — see [`permissions.md`](./permissions.md) |
| Opportunity Collaboration™ | Assignment, comments, status, sprint link, approvals |
| Growth Sprint Management™ | Surfaces existing `automation_sprints` |
| Approval Workflows™ | Member `opportunity_approvals` (+ existing share approvals) |
| Comments & Discussions™ | `opportunity_comments` (internal); keep share comments |
| Client Workspaces™ | Same workspace + Client role — see [`client-workspaces.md`](./client-workspaces.md) |
| Executive Dashboard™ | Compose `/dashboard/executive` + team hub entry |
| Activity Timeline™ | Read API over `audit_logs` |
| Audit Logs™ | List/export for privileged roles |

## Invite flow

1. Staff with `manageInvites` creates a `workspace_invites` row (token URL `/invite/[token]`).
2. Client invites require `role=client` and `clientId`.
3. Invitee signs in with Clerk, accepts token → `workspace_members` row (+ `clientId` for Client).
4. Expiry / revoke; seat limits reuse Agency plan limits.
5. Email delivery remains out of scope (copyable link).

## Fix Path integration

Every opportunity supports assignment, discussion, status tracking, sprint planning (Automation), and approval — without changing Fix Path Chooser™ routing.

## Surfaces

| Surface | Role |
| --- | --- |
| `/dashboard/team` | Team hub, invites, activity, audit |
| `/dashboard/my-growth` | Client-limited home (white-label) |
| `/invite/[token]` | Accept invite |
| `/api/team/*`, `/api/invite/*` | Invites + collab |

## Code map

- `src/lib/team/` — flag, invites, client scope, collaboration
- Extends `src/lib/agency/permissions.ts`, audit, clients
- Schema: `workspace_invites`, `workspace_members.clientId`, `opportunity_comments`, `opportunity_approvals`, `action_projects.sprintId`

## Related

- [`permissions.md`](./permissions.md)
- [`client-workspaces.md`](./client-workspaces.md)
- [`agency-platform.md`](./agency-platform.md)
- [`executive-briefing.md`](./executive-briefing.md)
- [`automation-engine.md`](./automation-engine.md)
- [`fix-paths.md`](./fix-paths.md)

## Out of scope

Separate client tenants; Clerk Organizations; SSO; email invite delivery; rebuilding share/comment/approve token flows or Agency clients CRUD.
