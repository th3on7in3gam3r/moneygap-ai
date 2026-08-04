# MoneyGap CLI

Local offline scanner package: [`packages/moneygap-cli`](../packages/moneygap-cli/) (`@moneygap/cli`, bin `moneygap`).

## What it does

- Detects common JS frameworks from `package.json` / config files
- Runs six read-only analyzers (SEO, AEO, performance heuristics, a11y, trust, growth)
- Prints MoneyGap Score™ in the terminal
- Writes `.moneygap/last-scan.json` plus JSON/MD/HTML reports
- Emits Fix Path™ suggestion markdown only (no auto-patch in v1)

Does **not** require the Next.js SaaS runtime, cloud login, or AI API keys for core scans.

Includes **AI Readiness** (`aiReadiness` category) plus `generate llms` / `validate llms` for offline llms.txt guidance. See also [`docs/ai-readiness.md`](./ai-readiness.md).

## Quick link

See package [README](../packages/moneygap-cli/README.md) and [architecture](../packages/moneygap-cli/docs/architecture.md).

## Related

- `docs/developer-mode.md` — in-product developer surfaces
- `docs/plugin-sdk.md` — broader plugin direction
- Public docs hub is separate (`content/docs/`) — this file is an engineering pointer only
