# MoneyGap Monitor™

## Mission

MoneyGap AI is an ongoing growth partner — not a one-shot report generator.

Monitor → Analyze → Recommend → Track → Improve

## Schedules

Per website, users can enable monitoring:

- Weekly
- Biweekly
- Monthly
- Custom (interval in days)

Due schedules are processed by `POST /api/cron/monitor` (secured with `CRON_SECRET`).

## Change detection

After each new analysis for a site, compare to the previous report:

- Score delta + reasons
- New / resolved opportunities
- Category score changes
- Competitor notes (when available)

Results persist in `analysis_comparisons` and feed notifications + briefs.

## Gap lifecycle

`lifecycleStatus`: detected → reviewed → planned → in_progress → completed → improved → resolved

Maps to Action Center `implementationStatus` for compatibility.

## Score evolution

`score_snapshots` stores MoneyGap Score™ history for Growth Timeline charts.

## Weekly Growth Brief

In-app “Your Weekly Growth Brief” with what changed, new opportunities, completed improvements, priorities, competitor updates, next steps. No email in Phase 6.

## Notifications

In-app notifications (score increases, new opportunities, completions). Bell in dashboard shell.

## Competitor foundation

`competitor_snapshots` stores lightweight fingerprints after Competitive Intelligence™ runs. Full competitor monitoring is future work.

## Code map

- `src/lib/monitor/` — schedule, compare, snapshot, brief, lifecycle, notify, run-due
- `/api/cron/monitor`, `/api/websites/[id]/monitor`, growth-journey, notifications, briefs
- Dashboard Growth Journey + websites schedule controls

## Growth OS™ (Phase 12)

Growth OS composes Monitor Journey + Weekly Briefs into the **Today Dashboard** and **AI Business Coach** (nudges from delays, competitor updates, score proximity). See `docs/growth-os.md`. Monitor cores are not rebuilt.

## Automation Engine™ (Phase 17)

Continuous Optimization™ soft-hooks Monitor comparisons to refresh Opportunity Queue™. See `docs/automation-engine.md`. Monitor cores are not rebuilt.

## Predictive Intelligence™ (Phase 20)

Forecasting soft-hooks Monitor post-process (snapshots / comparisons) to refresh workspace predictions and Predictive Alerts™. See `docs/predictive-intelligence.md`. Monitor cores are not rebuilt.

## Value

Continuous monitoring, new insights, progress tracking, AI recommendations, growth accountability.
