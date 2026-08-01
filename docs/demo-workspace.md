# Demo Workspace

## Brand

**Aurora Commerce** — same sample set as marketing preview and `npm run db:seed`.

Source of truth for the interactive demo UI: [`src/lib/sample-data.ts`](../src/lib/sample-data.ts) (`DEMO_WORKSPACE`, `SAMPLE_WEBSITES`, `SAMPLE_REPORTS`, `SAMPLE_GAPS`).

## Behavior

- Enter via Welcome → **Explore Demo Workspace** or Settings → Demo workspace  
- Route: `/dashboard/onboarding/demo`  
- Cookie `mg_demo_mode=1` + `demoExploredAt` on `workspace_onboarding`  
- Clearly badged **Demo data**  
- Does **not** write sample rows into the user’s real workspace  

## Exit

- **Start real setup** → exit cookie + go to onboarding website step  
- **Exit demo** → dashboard  

DB-seeded Aurora workspace remains available for marketing/seed tooling; onboarding demo is read-only sample-data hydration.
