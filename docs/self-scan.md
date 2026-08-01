# Self Scan™

## Mission

Scheduled and manual self-analysis of MoneyGap’s production URL.

## Triggers

| Trigger | Entry |
| --- | --- |
| Manual | `POST /api/self-optimization` from dashboard |
| Daily cron | `POST /api/cron/self-optimization` (`CRON_SECRET`) |
| Render | `moneygap-self-optimization` at `0 13 * * *` UTC |

## Pipeline

1. Resolve target URL (env / workspace settings)
2. Ensure website row in workspace
3. Link latest completed Money Gap analysis when present
4. Deterministic fetch of key paths + robots/sitemap
5. Score SEO, trust, conversion, performance (proxy), AI visibility, content coverage, backlinks (setup)
6. Attach AI Prompt Engine™ prompts
7. Persist scan, scores, findings, homepage metadata draft

## Reports

- Daily / weekly / monthly scan counts from real history
- Score deltas vs previous completed scan
- Top findings by estimated opportunity

`src/lib/self-optimization/reports/daily.ts`

## Honesty

Unreachable targets → failed/partial scan with errors. No synthetic score series.

## Related

- `docs/self-optimization.md`
- `docs/seo-intelligence.md`
