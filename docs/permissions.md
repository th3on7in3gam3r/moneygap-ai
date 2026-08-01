# Roles & Permissions™

## Phase

Phase 21 Team Workspace™ extends Phase 7 Agency RBAC in `src/lib/agency/permissions.ts`.

## Stored roles

| Brief role | Stored `workspace_members.role` | Notes |
| --- | --- | --- |
| Owner | `owner` | Full control |
| Executive | `executive` | Portfolio + billing + audit; no team manage |
| Marketing | `marketing` | Clients + recommendations; no billing/team |
| Developer | `developer` | Projects + recommendations |
| Analyst | `analyst` | Reports + recommendations |
| Client | `client` | Scoped to `clientId` only |
| (legacy) | `admin`, `client_manager`, `viewer`, `member` | Unchanged; `member` → analyst |

## Capabilities

| Capability | Meaning |
| --- | --- |
| `manageClients` | CRUD clients |
| `runReports` | Run analyses / reports |
| `editRecommendations` | Edit opportunity guidance |
| `viewBilling` | Billing / plan |
| `manageTeam` | Add/remove staff members |
| `manageBrand` | White-label brand settings |
| `viewClients` | List all clients (staff) |
| `manageWorkspace` | Org profile / type |
| `viewOwnClient` | Client role: own client record |
| `commentOwnClient` | Client role: opportunity comments |
| `approveOwnClient` | Client role: opportunity approvals |
| `viewAudit` | Activity / audit logs |
| `viewExecutive` | Executive Briefing hub |
| `manageProjects` | Assign projects / sprint links |
| `manageInvites` | Create / revoke workspace invites |

## Client scope

When `role === "client"`, `workspace_members.clientId` is required. APIs use `requireClientScope` so the member only sees websites/reports/opportunities linked to that client. Never grant `viewClients` to Client.

## Enforcement

- `hasCapability` / `requireAgencyPermission` for staff caps.
- `requireClientScope(clientId)` for Client (and when filtering by client).
- Soft-fail when Team Workspace is disabled: invite/collab APIs return a clear disabled message; Agency Phase 7 paths keep working.

## Related

- [`team-workspace.md`](./team-workspace.md)
- [`client-workspaces.md`](./client-workspaces.md)
- [`agency-platform.md`](./agency-platform.md)
