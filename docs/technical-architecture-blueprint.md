# Technical Architecture Blueprint™

Maps the MoneyGap Growth OS™ foundation blueprint onto the **shipped** codebase. Use this doc when extending the platform — do not rebuild layers that already exist.

Related: [Vision](./vision.md) · [MoneyGap Engine](./moneygap-engine.md) · [Golden Categories](./golden-categories.md) · [Monetization](./monetization.md) · [Security](./security.md) · [Platform 1.0](./platform-1.0.md)

---

## Stack (blueprint §1–2)

| Blueprint | Implementation |
| --- | --- |
| Next.js + React + TypeScript + Tailwind | `package.json`, App Router under `src/app/` |
| Auth (login / signup / reset / social) | Clerk — `src/app/sign-in`, `src/app/sign-up`, `src/proxy.ts` |
| Dashboard modules | `src/app/dashboard/*` (analyze, websites, money-gaps, reports, billing, copilot, …) |
| Reports / website scan UX | `/reports/[id]`, `/dashboard/analyze`, `/dashboard/websites/[id]` |

---

## Blueprint §3 — Roles vs plans

Product access is **plan entitlements**, not a Free/Pro/Growth OS/Developer/Agency user-role enum.

| Blueprint persona | PlanId(s) | Notes |
| --- | --- | --- |
| Free User | `free` | Basic scanning (`moneygap_engine`) |
| Pro User | `starter`, `professional` | Advanced intelligence limits + features |
| Growth OS User | `growth` | Action Center, Advisor, Opportunity Intelligence |
| Developer User | any with `api_access` + Developer Mode routes | Integrations via `/dashboard/developers`, `/api/v1` |
| Agency User | `agency`, `enterprise` | Clients, white-label, RBAC |

Workspace team RBAC (Owner / Executive / Marketing / Developer / Analyst / Client) is separate — see [permissions](./permissions.md). Gates use `planHasFeature` / usage limits in `src/lib/billing/`.

---

## Blueprint §4 — Database

| Blueprint table | Existing |
| --- | --- |
| Users | `users` + Clerk; workspace membership in `workspace_members` |
| Websites | `websites` (`workspaceId`, domain, name, …) |
| Scans | `website_analyses` (+ `analysis_jobs`, crawl job tables) |
| Pages | `website_pages`, `crawl_pages` / `crawl_jobs` |
| MoneyGap Opportunities | `money_gap_opportunities` (11 `moduleId`s; UI maps to 7 Categories™) |
| Growth Recipes | **No separate table** — recipe fields live on opportunities + `fixes` JSON + IDE prompts |
| Reports | `reports` (intelligence type) |

Schema: `src/db/schema.ts`.

---

## Blueprint §5–7 — Scanner & AI pipeline

```
URL → Crawler → Page discovery → Extraction → Technical/AI analysis
  → MoneyGap classification (11 modules) → Report + roadmap
```

| Piece | Path |
| --- | --- |
| Stages | `src/lib/analysis/stages.ts` |
| Pipeline | `src/lib/analysis/pipeline.ts` |
| Crawler | Firecrawl + `packages/moneygap-crawler` |
| Engine | `src/lib/analysis/engine/` |
| Golden category lens | `src/lib/moneygap/categories.ts` |
| APIs | `/api/analysis`, `/api/scan/*` (not `/api/scans`) |

AI opportunity shape (problem / opportunity / impact / difficulty / priority / implementation) is persisted on `money_gap_opportunities` and shown as Growth Recipe™ on opportunity cards.

---

## Blueprint §8 — MoneyGap Score™

- Overall `reports.moneyGapScore` (0–100).
- Engine stores **11** module scores (`categoryScores`).
- Customer lens: **7** Categories™ via `rollupCategoryScores` + score narratives (current / weaknesses / improvements) derived at render time — no extra DB columns required for first release.

---

## Blueprint §9 — Dashboards

| Blueprint surface | Route |
| --- | --- |
| Main dashboard | `/dashboard` |
| Website workspace | `/dashboard/websites`, `/dashboard/websites/[id]` |
| Opportunities | `/dashboard/money-gaps`, report Opportunities tab |
| Growth Recipes | Workspace Recipes tab + opportunity card Growth Recipe™ |
| Settings / billing | `/dashboard/settings`, `/dashboard/billing` |

---

## Blueprint §10 — Subscriptions

Plans: `free` \| `starter` \| `growth` \| `professional` \| `agency` \| `enterprise` in `src/lib/billing/catalog.ts`. Stripe checkout/portal/webhooks under `src/app/api/billing/`. Soft-enable when keys unset — see Platform 1.0 docs.

---

## Blueprint §11 — APIs

| Blueprint example | Actual |
| --- | --- |
| `/api/websites` | Thin: score-history, monitor; list via server loaders |
| `/api/scans` | `/api/analysis`, `/api/scan/*` |
| `/api/reports` | Report pages + `/api/v1/reports/[id]` |
| `/api/opportunities` | `/api/v1/.../opportunities`, dashboard money-gaps |
| `/api/growth-recipes` | Not a resource — embedded on opportunities |
| `/api/billing` | `/api/billing/*` |
| `/api/ai-analysis` | Analysis pipeline + advisor/copilot APIs |

Public platform API: `/api/v1/*` — [public-api](./public-api.md).

---

## Blueprint §12 — AI prompt management

Runtime generation for ChatGPT / Claude / Cursor / Kiro / etc.: `src/lib/developer/blueprints.ts`, `/dashboard/ide-prompt`. Not a prompt CMS — templates are code-backed.

---

## Blueprint §13 — Future expansion (already partially shipped)

| Placeholder | Status |
| --- | --- |
| AI Growth Agent™ | Copilot / Advisor — shipped |
| Developer OS™ | Developer Mode + `/api/v1` — shipped |
| Browser Extension™ | Waitlist + share ingest only — Chrome package **deferred** |
| Agency OS™ | Clients, brand, share links — shipped |

---

## Blueprint §14 — Security

Clerk auth, workspace-scoped queries, API keys, in-memory rate limits (`src/lib/security/rate-limit.ts`). See [security](./security.md).

**Deferred hardening:** Postgres RLS, durable multi-instance rate limits.

---

## Blueprint §15 — Phase status

| Phase | Status |
| --- | --- |
| 1 Foundation (auth, DB, dashboard, websites) | **Shipped** |
| 2 Analysis (scanner, AI, categories) | **Shipped** |
| 3 Reporting (scores, opportunities, recipes UI) | **Shipped** (+ workspace + narratives polish) |
| 4 Monetization (Stripe, feature gates) | **Shipped** (soft-Stripe ready) |
| 5 Expansion (agent, developer, agency) | **Mostly shipped**; extension package deferred |

---

## Do not rebuild

Already production paths — extend, don’t recreate:

- Clerk authentication and middleware
- Drizzle schema / Neon Postgres
- Analysis pipeline + 11-module MoneyGap engine
- Report view, Money Gaps board, Growth Recipe™ card framing
- Billing catalog, entitlements, Stripe routes
- IDE prompt / Fix Path / Developer Mode
- Agency clients + RBAC
- Copilot / Advisor

---

## Deferred (explicit non-goals for this foundation close)

1. Chrome / browser extension package (marketing waitlist remains)
2. Separate `growth_recipes` table or `/api/growth-recipes`
3. Renaming product APIs to blueprint path names
4. New Free/Pro/Growth OS role enum (plans stay source of truth)
5. Prompt template CMS / admin versioning UI
6. Postgres RLS and Redis-backed rate limits
`,