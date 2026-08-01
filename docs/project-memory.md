# Project Memory™

## Mission

Persist the workspace technology profile so future Developer Mode recommendations automatically adapt to the detected stack.

## Phase

Part of **Phase 15 — Developer Mode™ & Stack Intelligence™** (brief “Phase 13”).

## Storage

`workspace_tech_profiles`:

- `stack` — `TechStackProfile` jsonb
- `sourceRepoId` — originating `developer_repos` row
- `confidence` — detection confidence
- `version` — profile schema version
- One active profile per workspace (upsert on analyze)

## Lifecycle

1. Sync GitHub repos (Integration Hub connection required)
2. User authorizes Analyze on a primary repo
3. Stack Intelligence™ writes Project Memory
4. Implementation Planner™ / Blueprints read memory first; fall back to generic guidance if empty

## Adaptation

Plans prefer stack-native paths (e.g. Next.js App Router files, Drizzle schema, Clerk middleware) when memory is present. Evidence chips surface *why* a path was chosen.

## Code

`src/lib/developer/memory.ts`

See [`developer-mode.md`](./developer-mode.md), [`stack-intelligence.md`](./stack-intelligence.md).
