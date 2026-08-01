# Competitive Intelligence™

## Purpose

Competitive Intelligence™ is a **strategic business comparison engine** — not a competitor list.

It discovers why peers succeed and how the user can close the highest-value gaps:

Visibility → Traffic → Leads → Customers → Revenue → Growth

## What it is not

- Not a raw competitor directory
- Not an SEO metrics dump
- Not a backlink-only tool

## Pipeline

1. **Discover** 7 relevant competitors (industry, products, search intent, business model, audience)
2. **Crawl** up to 4 pages per competitor (Firecrawl)
3. **Profile** each competitor (business overview through AI features, strengths/weaknesses)
4. **Analyze** head-to-head, opportunity/content/authority/monetization gaps, advantages, SWOT, top-10 recommendations, opportunity timeline
5. **Persist** for `/reports/[id]` Competitive tab

Soft-fail: Phase 2/3 remain usable if competitive fails. Retry via `POST /api/analysis/[id]/competitive`.

## Discovery rules

Identify 5–10 peers (default **7**) using Phase 2 intelligence:

- Industry, products/services, business model, revenue model, target audience, search intent

For each competitor capture: name, website, business summary, industry, target audience, estimated company size (AI Estimate).

## Competitor profile

Business overview, revenue model, products, services, pricing visibility, lead generation, content strategy, trust signals, CTAs, newsletter, community, digital products, memberships, affiliate, consulting, automation, AI features, overall strengths, overall weaknesses.

## Analysis outputs

| Output | Purpose |
| --- | --- |
| Executive Competitive Brief | Top-of-tab strategist summary |
| Head-to-head | You vs each competitor by category (Revenue, Authority, SEO, Content, Trust, Conversion, Marketing, Automation, Customer Experience) |
| Opportunity gaps | Competitor has / user missing / impact / AI estimate / recommendation |
| Content gaps | Topics peers cover that user does not |
| Authority gaps | Mentions, PR, partnerships — business impact first |
| Monetization gaps | Missing revenue strategies that fit the user’s model |
| Advantages | Where the user is already stronger |
| SWOT | Landscape-based Strengths / Weaknesses / Opportunities / Threats |
| Top 10 recommendations | Impact × ease × expected ROI |
| Opportunity timeline | When to act |

## Relationship to MoneyGap Engine™

- Phase 3 **Competitive** module still emits peer-pattern findings into Opportunities.
- Phase 4 owns named-competitor strategy UI and refreshes `categoryScores.competitive` on success.

## Code map

- `src/lib/analysis/competitive/` — discover, crawl, profile, analyze, orchestrator, persist
- `competitors` table + `reports.competitiveBrief` / `competitiveAnalysis`
- UI: `src/components/competitive/*` + Competitive tab in `report-view.tsx`

## Defaults (cost / latency)

- 7 competitors
- ≤4 pages per competitor crawl
- Crawl concurrency 2
- No paid backlink APIs (visible signals + AI estimates only)
