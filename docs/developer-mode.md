# Developer Mode™ & Stack Intelligence™

## Mission

MoneyGap AI becomes an **AI Engineering Partner**: understand the user’s technology stack and prepare implementation-ready plans that fit the existing architecture—without replacing developer review.

## Phase

**Phase 15 — Developer Mode™ & Stack Intelligence™**  
(Brief label “Phase 13 (Developer Mode)”. Integration Hub = Phase 14 / brief “Phase 12”; Knowledge Graph = Phase 13; Growth OS = Phase 12; Trust = Phase 11.)

## Principles

- Soft-fail; never block Phase 2 reports or Engine runs.
- Compose with Integration Hub™ GitHub OAuth — do not rebuild connectors.
- Distinct from Action Center™ marketing playbooks (`growth-advisor.md`).
- Distinct from `/dashboard/developers` (Phase 10 API keys).
- **Never push directly to `main` / `master`.** Draft PRs only, after explicit authorization.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™.

## Core modules

| Module | Role |
| --- | --- |
| Repository Intelligence™ | List/select connected GitHub repos; read key manifests |
| Stack Intelligence™ | Detect frontend, backend, DB, ORM, auth, hosting, etc. |
| Framework Intelligence™ | Framework-specific cues (Next.js, Nest, …) |
| Deployment Intelligence™ | Hosting cues (Vercel, Render, …) from configs |
| Implementation Planner™ | Files to create/update, reuse, time, risk, checklist |
| AI Blueprint Generator™ | Tool-specific prompts (Cursor, Claude, Copilot, …) |
| Pull Request Generator™ | Feature branch + draft PR (authorized) |
| Testing Intelligence™ | Validation/test steps on each plan |
| Rollback Intelligence™ | Rollback steps + risk summary |
| Project Memory™ | Persist tech profile for future plans |

## Security

- Owner/admin for mutations
- Explicit `authorize: true` for repo analyze and PR creation
- Audit logging (`developer_audit_logs`)
- Encrypted Hub credentials; no secrets in client responses

## UI

`/dashboard/developer-mode` — stack profile, repos, plans, blueprints, PR drafts. Linked from Settings.

**IDE Prompt page** (`/dashboard/ide-prompt`) — Fix Path “Code + AI” lands here first with ready-to-copy Cursor / Claude / … prompts for the current opportunity. Developer Mode (plans, GitHub, draft PRs) remains secondary.

## Code map

- `src/lib/developer/` — stack detect, memory, planner, blueprints, ide-prompt, PR, risk, authz
- `src/app/api/developer-mode/` — overview, repos, plans, PR, audit, ide-prompt
- Tables: `developer_repos`, `workspace_tech_profiles`, `developer_implementation_plans`, `developer_blueprints`, `developer_pr_drafts`, `developer_audit_logs`

## Related

- [`stack-intelligence.md`](./stack-intelligence.md)
- [`project-memory.md`](./project-memory.md)
- [`integration-hub.md`](./integration-hub.md)
- [`fix-paths.md`](./fix-paths.md) — Phase 18 “Code + AI” → IDE Prompt page; Developer Mode for plans / PRs

## Future expansion

Deeper file-tree analysis; CI awareness; merge policies. Out of scope for 15: autonomous local code writes, force-push, PR merge, OI rewrite, sidebar redesign.
