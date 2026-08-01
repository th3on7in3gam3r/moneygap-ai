# Plugin SDK™

## Phase

Phase 22 Marketplace™ — contracts for future extensions. **No arbitrary plugin code execution** in this phase.

## Manifest

Plugins / packs declare a JSON manifest (see `src/lib/marketplace/plugin-sdk/manifest.ts`):

| Field | Role |
| --- | --- |
| `id` | Unique slug |
| `name` | Display name |
| `version` | Semver string |
| `category` | Marketplace category |
| `capabilities` | Declared capabilities (install, widget, recipe, …) |
| `entrypoint` | Reserved for future runtime (ignored now) |
| `source` | Optional refs: automation template, KG slug, fix path id, agent slug |

## Install contract

1. Listing published in Growth Marketplace™.
2. Workspace installs → `marketplace_installs` row + compose target (draft workflow, KG deep-link, fix-path bookmark).
3. Emit event `listing.installed` (in-process / webhook-ready name).

## Events

| Event | When |
| --- | --- |
| `listing.installed` | Successful install |
| `listing.uninstalled` | Reserved |
| `review.created` | Review upsert |
| `academy.lesson_completed` | Lesson progress |
| `creator.revenue_attributed` | Stub ledger write (AI Estimate) |

## SDKs

- **REST** — existing MoneyGap API™ (`/api/v1`) + keys/webhooks ([`api-platform.md`](./api-platform.md))
- **JavaScript** — `packages/moneygap-js`
- **Python** — `packages/moneygap-python`

## Related

- [`marketplace.md`](./marketplace.md)
- [`partner-program.md`](./partner-program.md)
