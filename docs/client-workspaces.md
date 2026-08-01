# Client Workspaces™

## Model (Phase 21)

**One tenant architecture:** clients do not get a separate MoneyGap workspace. They join the **organization workspace** with role `client` and a required `clientId` pointing at an existing Agency `clients` record.

This prepares future multi-tenant expansion (workspace-per-client) without implementing it now.

## What clients can do

- View **My Growth** (`/dashboard/my-growth`) with agency white-label branding
- See opportunities / projects for their linked websites only
- Comment and approve on opportunities (member approvals)
- Use existing share-link comment/approve when given a public token (unchanged)

## What clients cannot do

- List other clients, manage team, billing, brand, Automation publish, Developer Mode, Copilot admin surfaces
- See portfolio / agency Clients list

## Invitation

1. From client detail or Team hub: create invite with `role=client` + `clientId`.
2. Copy `/invite/[token]` (email delivery OOS).
3. Accept after Clerk auth → membership with `clientId`.

## White-label

Reuse `agency_brand_settings` on My Growth and existing share/report branding. Do not fork a second brand system.

## Security

- Org isolation via `workspaceId`
- Client isolation via `clientId` on membership + query filters
- Secure random invite tokens, expiry, revoke
- Audit: `invite.create`, `invite.accept`, `invite.revoke`, comment/approve actions

## Related

- [`team-workspace.md`](./team-workspace.md)
- [`permissions.md`](./permissions.md)
- [`agency-platform.md`](./agency-platform.md)
