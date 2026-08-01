# Business Memory™

## Mission

Persist durable **workspace** business context so Growth Copilot™ can advise without re-asking the same facts every session.

## Phase

Part of **Phase 19 — Growth Copilot™**.

## Distinct from

| Store | Scope | Content |
| --- | --- | --- |
| **Business Memory™** | Workspace | Facts, preferences, decisions, open questions |
| **Project Memory™** | Workspace | Tech stack profile (Developer Mode™) — see [`project-memory.md`](./project-memory.md) |
| Report `business_profiles` / `audience_profiles` | Per analysis | Snapshot from Website Intelligence |
| Advisor memory (Phase 6) | Report chat context | Completed gaps, score history, growth briefs |

## Entry kinds

- `fact` — durable business truth (ICP, pricing model, geography)
- `preference` — how the user likes to work (tone, risk appetite)
- `decision` — recorded strategic choice
- `open_question` — unresolved item for follow-up

## Schema

`business_memory_entries` — `kind`, `key`, `value` (jsonb), `source`, `confidence`, workspace FK.

## Principles

- Soft-fail if table missing / empty — Copilot still chats with OS context.
- User-editable via `/api/copilot/memory` and Copilot UI.
- Never treat memory as guaranteed revenue claims.

## Code

`src/lib/copilot/memory.ts`

See [`growth-copilot.md`](./growth-copilot.md).
