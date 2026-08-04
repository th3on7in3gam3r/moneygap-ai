# Programmatic Fix Paths™

MoneyGap AI surfaces Money Gaps™ with ranked Opportunity Index™. Closing them can be manual in Action Center™ — or **programmatic** with the tools below.

## 1. Free live diagnostics (no account)

```bash
npx moneygap-scan https://example.com
```

Checks crawlability (robots/sitemap), JSON-LD schema, and performance **signals**. Same engine as the homepage sandbox.

These heuristics show *what* is leaking. Step-by-step Fix Paths™ require a free account and a full MoneyGap Engine™ scan.

## 2. Full analysis API

Authenticated workspaces can start analyses via `/api/analysis` (session) or `/api/v1/analyze` (API keys from Developer Hub™).

Typical loop:

1. Analyze URL → report + Money Gaps™
2. Open Fix Path™ for the top opportunity
3. Implement in IDE / Developer Mode / FixFlow™
4. Re-scan to verify score movement

## 3. Mapping common gaps to Fix Paths™

| Gap class | Start here |
| --- | --- |
| Crawl / robots / sitemap | Guides: crawlability; CLI `moneygap-scan`; docs Crawlability Score™ |
| Schema / AEO | Docs: Money Gaps™ & Fix Paths™; add Organization / FAQ JSON-LD |
| Conversion / CTA | Action Center™ checklist Fix Path |
| Trust / policy pages | Trust Fix Path + Growth Academy playbooks |
| Performance CLS / images | Developer Mode™ / IDE prompt with image dimension fixes |

## 4. CI/CD (waitlist)

Pipeline-native scans (fail builds on critical crawl/schema regressions) are on the [CLI waitlist](/cli). Until then, run `npx moneygap-scan` in CI as a soft report step.

## 5. Related reading

- [Money Gaps™ and Fix Paths™](/docs/money-gaps-and-fix-paths)
- [Getting started](/docs/getting-started)
- [MoneyGap Score™](/docs/moneygap-score)
- Internal: `docs/fix-paths.md`, `docs/cli-sandbox.md`
