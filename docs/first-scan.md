# First Scan (Onboarding)

## Lightweight discovery (step 2)

`discoverWebsiteSignals` runs in `after()` after `POST /api/onboarding/discover`:

- DNS lookup  
- HTTPS/SSL probe  
- HTML fetch → title/description  
- Heuristic CMS / framework / hosting  

This is **not** the MoneyGap Engine. Results live in `workspace_onboarding.discovery_signals`.

## Full AI scan (step 6)

`POST /api/onboarding/start-scan` reuses the same path as `POST /api/analysis`:

- Validate URL, upsert website, queue `websiteAnalyses`  
- `runAnalysisPipeline` in `after()`  
- Billing gate + usage recording  

UI: `AnalysisProgress` with `stayOnComplete` so onboarding can show first results instead of hard-redirecting to the report.

## First results

After completion, `POST /api/onboarding/link-report` stores `reportId` and `getFirstResultsSummary` returns:

- MoneyGap Score™  
- Opportunity count  
- Top opportunity + **AI Estimate** range  
- Confidence  
- Primary Fix Path™ (`recommendFixPaths`)  
- Recommended next step  

Then `POST /api/onboarding/complete` seeds the Growth Copilot™ welcome message.
