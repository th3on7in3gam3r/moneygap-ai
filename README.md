# MoneyGap AI

Premium AI Business Growth Intelligence Platform.

> **Documentation-driven development:** Read [`/docs`](./docs) before implementing features — especially `vision.md`, `product-philosophy.md`, and `moneygap-engine.md`.

## Phase 1 (foundation)

- Marketing site (home, pricing, about)
- Clerk authentication
- SaaS dashboard with dark mode
- Neon/Postgres schema via Drizzle
- Sample analytics, reports, and Money Gap UI

## Phase 2–13

- Website crawling + business intelligence
- Modular **MoneyGap Engine™**
- **Competitive Intelligence™**, **AI Growth Advisor™ & Action Center™**, **MoneyGap Monitor™**
- **MoneyGap Agency Platform™** — clients, teams, RBAC, white-label
- **Monetization Architecture** — plans, entitlements, usage metering, billing readiness (pre-Stripe)
- **MoneyGap API™ & Enterprise Intelligence™** — `/api/v1`, API keys, webhooks, developer dashboard
- **Trust Engine™ & Production Readiness** — explainable findings, QA gates, health, launch checklist
- **MoneyGap Growth OS™** — Today Dashboard, goals, portfolio, priority engine, execution mode
- **MoneyGap Knowledge Graph™ / Industry, Business Model & Growth Pattern Intelligence™** — profiles, benchmarks, classification override, gap reports, Growth Pattern Library™ matching, Engine context
- **MoneyGap Integration Hub™** — connect analytics, CRM, email, CMS, hosting, payments, and automation with encrypted credentials and health scoring
- **Developer Mode™ & Stack Intelligence™** — repo-aware stack detection, Project Memory™, implementation plans, AI blueprints, authorized draft PRs
- **Confidence & Implementation Intelligence™** — five confidence engines, Risk/Impact/Explainability/Validation, Confidence Center™
- **MoneyGap Automation Engine™ & AI Workforce™** — Automation Studio™, specialized agents, workflows, sprints, Executive Briefing™
- **Fix Path Chooser™** — pick how to fix each gap (Action Center, code/AI, automation, Hub, Advisor)
- **Growth Copilot™** — Ask MoneyGap™, Business Memory™, Decision Engine™, strategic plans
- **Predictive Intelligence™** — forecasts, What-If Simulator™, Predictive Alerts™
- **Team Workspace™** — org invites, Client role, opportunity collaboration, audit timeline
- **Marketplace™** — Growth Marketplace catalog, packs, partners, academy, verified patterns
- **Platform 1.0™** — launch readiness, security, ops, soft Stripe billing, customer success
- Opportunities-first `/reports/[id]`

## Stack

- Next.js 16 (App Router)
- Clerk
- Neon Postgres + Drizzle ORM
- Firecrawl + OpenAI
- Tailwind CSS v4
- Recharts + Framer Motion

## Setup

1. Copy env:

```bash
cp .env.example .env.local
```

2. Add Clerk keys from [dashboard.clerk.com](https://dashboard.clerk.com/~/api-keys).

3. Set `DATABASE_URL`, `FIRECRAWL_API_KEY`, and `OPENAI_API_KEY`.

4. Optional: `CRON_SECRET` for Monitor + Agency report crons. Optional: `FEATURE_TRUST_ENGINE`, `MAINTENANCE_MODE`.

5. Install & run:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

| Doc | Purpose |
| --- | --- |
| [docs/vision.md](./docs/vision.md) | Mission and north-star |
| [docs/product-philosophy.md](./docs/product-philosophy.md) | Finding standards |
| [docs/moneygap-engine.md](./docs/moneygap-engine.md) | Modular engine |
| [docs/competitive-intelligence.md](./docs/competitive-intelligence.md) | Phase 4 competitive strategy |
| [docs/growth-advisor.md](./docs/growth-advisor.md) | Phase 5 Action Center & Advisor |
| [docs/moneygap-monitor.md](./docs/moneygap-monitor.md) | Phase 6 Monitor & growth loop |
| [docs/agency-platform.md](./docs/agency-platform.md) | Phase 7 Agency Platform |
| [docs/monetization.md](./docs/monetization.md) | Phase 8 Monetization Architecture |
| [docs/api-platform.md](./docs/api-platform.md) | Phase 10 MoneyGap API™ & Enterprise |
| [docs/trust-engine.md](./docs/trust-engine.md) | Phase 11 Trust Engine™ |
| [docs/growth-os.md](./docs/growth-os.md) | Phase 12 Growth OS™ |
| [docs/knowledge-graph.md](./docs/knowledge-graph.md) | Phase 13 / 13.1 Knowledge Graph™ Foundation |
| [docs/industry-intelligence.md](./docs/industry-intelligence.md) | Phase 13.2 Industry Intelligence™ |
| [docs/business-model-intelligence.md](./docs/business-model-intelligence.md) | Phase 13.3 Business Model Intelligence™ |
| [docs/growth-pattern-library.md](./docs/growth-pattern-library.md) | Phase 13.4 Growth Pattern Library™ |
| [docs/integration-hub.md](./docs/integration-hub.md) | Phase 14 MoneyGap Integration Hub™ |
| [docs/developer-mode.md](./docs/developer-mode.md) | Phase 15 Developer Mode™ |
| [docs/stack-intelligence.md](./docs/stack-intelligence.md) | Stack Intelligence™ |
| [docs/project-memory.md](./docs/project-memory.md) | Project Memory™ |
| [docs/confidence-engine.md](./docs/confidence-engine.md) | Phase 16 Confidence Intelligence™ |
| [docs/risk-intelligence.md](./docs/risk-intelligence.md) | Risk Intelligence™ |
| [docs/explainability.md](./docs/explainability.md) | Explainability™ |
| [docs/automation-engine.md](./docs/automation-engine.md) | Phase 17 Automation Engine™ |
| [docs/ai-workforce.md](./docs/ai-workforce.md) | AI Workforce™ |
| [docs/executive-briefing.md](./docs/executive-briefing.md) | Executive AI Briefing™ |
| [docs/fix-paths.md](./docs/fix-paths.md) | Phase 18 Fix Path Chooser™ |
| [docs/growth-copilot.md](./docs/growth-copilot.md) | Phase 19 Growth Copilot™ |
| [docs/business-memory.md](./docs/business-memory.md) | Business Memory™ |
| [docs/decision-engine.md](./docs/decision-engine.md) | Decision Engine™ |
| [docs/predictive-intelligence.md](./docs/predictive-intelligence.md) | Phase 20 Predictive Intelligence™ |
| [docs/forecasting-engine.md](./docs/forecasting-engine.md) | Forecasting Engine™ |
| [docs/prediction-confidence.md](./docs/prediction-confidence.md) | Prediction Confidence™ |
| [docs/team-workspace.md](./docs/team-workspace.md) | Phase 21 Team Workspace™ |
| [docs/permissions.md](./docs/permissions.md) | Roles & Permissions™ |
| [docs/client-workspaces.md](./docs/client-workspaces.md) | Client Workspaces™ (one-tenant) |
| [docs/marketplace.md](./docs/marketplace.md) | Phase 22 Marketplace™ |
| [docs/plugin-sdk.md](./docs/plugin-sdk.md) | Plugin SDK™ contracts |
| [docs/growth-patterns.md](./docs/growth-patterns.md) | Verified Growth Patterns™ |
| [docs/partner-program.md](./docs/partner-program.md) | Partner Program™ |
| [docs/platform-1.0.md](./docs/platform-1.0.md) | Phase 23 Platform 1.0™ |
| [docs/security.md](./docs/security.md) | Enterprise Security™ |
| [docs/public-api.md](./docs/public-api.md) | Public API™ launch guide |
| [docs/customer-success.md](./docs/customer-success.md) | Customer Success™ |
| [docs/operations.md](./docs/operations.md) | Operations™ |
| [docs/production-checklist.md](./docs/production-checklist.md) | Launch / deploy / rollback |
| [docs/scoring-system.md](./docs/scoring-system.md) | MoneyGap Score™ |
| [docs/report-framework.md](./docs/report-framework.md) | Report structure |
| [docs/ui-guidelines.md](./docs/ui-guidelines.md) | Enhance-not-redesign |
| [docs/ai-prompt-standards.md](./docs/ai-prompt-standards.md) | Prompt rules |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to Neon |
| `npm run db:seed` | Seed sample analytics & reports |
| `npm run db:studio` | Drizzle Studio |

## Roadmap

- **Phase 9** — Stripe Checkout, webhooks, Customer Portal
- **Phase 10** — MoneyGap API™ & Enterprise Intelligence™
- **Phase 11** — Trust Engine™ & Production Readiness
- **Phase 12** — MoneyGap Growth OS™
- **Phase 13 / 13.1 / 13.2 / 13.3 / 13.4** — Knowledge Graph™, Industry Intelligence™, Business Model Intelligence™ & Growth Pattern Library™
- **Phase 14** — MoneyGap Integration Hub™
- **Phase 15** — Developer Mode™ & Stack Intelligence™
- **Phase 16** — Confidence & Implementation Intelligence™
- **Phase 17** — MoneyGap Automation Engine™ & AI Workforce™
- **Phase 18** — Fix Path Chooser™
- **Phase 19** — Growth Copilot™
- **Phase 20** — Predictive Intelligence™
- **Phase 21** — Team Workspace™ & Enterprise Collaboration™
- **Phase 22** — MoneyGap Marketplace™ & Growth Ecosystem™
- **Phase 23** — MoneyGap Platform 1.0™ (Launch Readiness)
