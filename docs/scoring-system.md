# Scoring System

## MoneyGap Score™

Overall score **0–100** representing how much growth opportunity remains uncaptured relative to what a mature peer in the same model typically has in place.

Higher score = more missing opportunity / more work left to close gaps.

## Category scores

Each intelligence module contributes a category score **0–100**:

- revenue
- authority
- seo
- content
- trust
- conversion
- marketing
- automation
- customer
- ai
- competitive

Category score reflects severity and volume of **missing** opportunities in that module.

## Opportunity Index™

Per-finding score **0–100** combining:

- Estimated business impact
- Confidence
- Expected ROI
- Inverse difficulty (easier high-ROI gaps score higher)

Used to rank cards and build the Growth Roadmap.

## Priority engine

Every finding receives:

- **Critical**
- **High**
- **Medium**
- **Low**

Based on business impact, difficulty, and estimated ROI.

## Knowledge Graph soft modifiers (Phase 13 / 13.2)

Industry expectation gaps, common gaps, and recommendation rules may **soft-boost** `priorityScore` after Engine scoring. Opportunity Index™ and MoneyGap Score™ formula weights are unchanged.

**Industry fit** (`industryFitScore`) and **business model fit** (`businessModelFitScore`) on gap reports are separate 0–100 soft measures — they do **not** replace MoneyGap Score™. See `docs/industry-intelligence.md` and `docs/business-model-intelligence.md`.

Business model common gaps / missing revenue stages may also soft-boost `priorityScore` after Engine scoring (Phase 13.3).

Matched Growth Pattern Library™ recommendations may soft-boost findings that close pattern conditions (Phase 13.4). Sets `kgMeta.patternFitNote`.

## Rollups on reports

- `moneyGapScore` — overall MoneyGap Score™
- `categoryScores` — per-module breakdown
- `revenueAtRisk` — sum of estimated annual revenue opportunities (AI Estimate)
- `capturePotential` — framed recoverable portion (~65% of at-risk by default)
- `opportunitySummary` / `executiveBrief` — what to do next

## Display rules

- Always label estimates **AI Estimate** / **Estimated Opportunity**
- Never imply guarantee of financial results
- Show category breakdown with progress bars on the report hero

## Crawlability Score™

Separate **health** metric (0–100, higher = better) for discovery/crawl/indexability. Status bands: Excellent / Good / Needs Attention / Critical. See `docs/crawlability-score.md`. Not a MoneyGap Engine category score (those use opposite polarity).

## Score evolution (Phase 6)

Track over time via `score_snapshots`:

- Current vs previous MoneyGap Score™
- Score history / Growth Timeline
- Category improvements after re-analysis

See `docs/moneygap-monitor.md`.
