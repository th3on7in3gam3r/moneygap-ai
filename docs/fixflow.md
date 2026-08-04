# MoneyGap FixFlow™

## Mission

Move from “here are your problems” to **reviewable, developer-ready fix proposals** that can eventually become authorized GitHub draft PRs—without rebuilding Developer Mode, Action Center, or Integration Hub.

## Workflow

Detect Issue → Generate Fix → Review Change → Create Branch → Create Pull Request (draft only)

v1 ships **Detect → Generate → Review (approve/reject)**. Branch/PR are prepared via validators + Developer Mode handoff; never auto-merge.

## Safety

- User approval required (`draft` → `approved`)
- Feature branches only (`moneygap/*` or `fixflow/*`)
- Diff preview + explanation required before PR
- Explicit `authorize: true` for any future PR call
- Never push to `main` / `master` / `production`
- Never auto-merge

## Code map

| Path | Role |
| --- | --- |
| `src/lib/fixflow/types.ts` | Proposal, diff, agent, PR payload types |
| `src/lib/fixflow/proposals.ts` | Phase 1 Fix Proposal Engine |
| `src/lib/fixflow/service.ts` | Persist / approve / PR readiness |
| `src/lib/fixflow/agents/fix-agent.ts` | FixAgent interface + heuristic stub |
| `src/lib/fixflow/git/provider.ts` | Provider-agnostic repo intel |
| `src/lib/fixflow/github/adapter.ts` | Wraps existing GitHub API helpers |
| `src/lib/fixflow/diff/preview.ts` | Unified diff helpers |
| `src/lib/fixflow/validators/safety.ts` | Pre-branch / pre-PR gates |
| `src/app/api/fixflow/proposals/` | Create / list / get / approve |
| `src/components/fixflow/` | IDE Prompt proposal panel |
| Table `fixflow_proposals` | Workspace-scoped proposals |

## Compose, don’t rebuild

- Opportunities: `money_gap_opportunities`
- Plans / stack: `src/lib/developer/planner.ts`, Project Memory
- GitHub OAuth + draft PR: Integration Hub + Developer Mode (`pr.ts`)
- Fix Path `developer_ai` → IDE Prompt → **Generate FixFlow proposal**

Distinct from `/dashboard/developers` (API keys) and Action Center marketing assets.

## SQL (Neon)

```sql
CREATE TABLE IF NOT EXISTS fixflow_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES money_gap_opportunities(id) ON DELETE SET NULL,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  repo_id uuid REFERENCES developer_repos(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES developer_implementation_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  proposal jsonb NOT NULL,
  diff_preview jsonb,
  approved_by_user_id text,
  approved_at timestamptz,
  created_by_user_id text,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS fixflow_proposals_workspace_idx ON fixflow_proposals (workspace_id);
CREATE INDEX IF NOT EXISTS fixflow_proposals_opportunity_idx ON fixflow_proposals (opportunity_id);
CREATE INDEX IF NOT EXISTS fixflow_proposals_status_idx ON fixflow_proposals (status);
```

## Roadmap

- Automated tests / CI check hooks on proposals
- Deployment validation steps
- Rollback playbooks tied to draft PRs
- Continuous optimization from resolved Money Gaps
- Live multi-file codegen via FixAgent + GitLab MRs

## Related

- [`developer-mode.md`](./developer-mode.md)
- [`fix-paths.md`](./fix-paths.md)
- [`integration-hub.md`](./integration-hub.md)
