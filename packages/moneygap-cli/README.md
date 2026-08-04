# moneygap-scan

Live URL diagnostics + offline developer CLI for Money Gaps™.

**Requires Node.js 22+.**

## Quickstart (live URL)

```bash
npx moneygap-scan https://example.com
```

Runs lightweight checks:

- Crawlability (robots.txt + sitemap)
- Schema (JSON-LD parse / basic validation)
- Performance **signals** (HTML heuristics — not lab Core Web Vitals)

These are free diagnostics — not a full MoneyGap AI report with Fix Paths™.

## Offline project scan

```bash
npm install -g moneygap-scan   # optional
moneygap init
moneygap doctor
moneygap scan
moneygap generate llms
moneygap report
```

Or from this monorepo:

```bash
cd packages/moneygap-cli && npm install && npm run build
npm link
moneygap-scan https://example.com
moneygap scan
```

## Commands

| Command | Purpose |
| --- | --- |
| `moneygap-scan <url>` | Live URL diagnostics |
| `moneygap scan-url <url>` | Same as above via `moneygap` bin |
| `moneygap scan` | Offline filesystem analyzers → MoneyGap Score™ |
| `moneygap init` | Write `moneygap.config.ts` + `.moneygapignore` |
| `moneygap report` | JSON / Markdown / HTML under `.moneygap/reports/` |
| `moneygap fix` | Recommendation markdown only |
| … | See `moneygap --help` |

## Publish

```bash
cd packages/moneygap-diagnostics && npm run build
cd ../moneygap-cli && npm install && npm run build
npm publish --access public
```

Ensure `moneygap-diagnostics` is published first (or bundled) so the file: dependency resolves for consumers — for npm publish, prefer publishing `moneygap-diagnostics` to the registry and changing the dependency to a version range.

## License

MIT
