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

After findings print, an **interactive TTY prompt** asks for email to publish an [Open Audit](https://www.moneygap-ai.com/labs) and email the visual report link. Skipped automatically in CI, non-TTY pipes, or with `--yes` / `--no-prompt` / `MONEYGAP_NO_PROMPT=1`. Override API host with `MONEYGAP_API_ORIGIN` (default `https://www.moneygap-ai.com`).

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
| `moneygap-scan <url> [--yes]` | Live URL diagnostics (+ optional email report) |
| `moneygap scan-url <url> [--yes\|--no-prompt]` | Same as above via `moneygap` bin |
| `moneygap scan` | Offline filesystem analyzers → MoneyGap Score™ |
| `moneygap init` | Write `moneygap.config.ts` + `.moneygapignore` |
| `moneygap report` | JSON / Markdown / HTML under `.moneygap/reports/` |
| `moneygap fix` | Recommendation markdown only |
| … | See `moneygap --help` |

## GitHub Action (PR growth regressions)

Add a workflow that fails (or soft-reports) when crawl/schema/performance-signal checks regress:

```yaml
# .github/workflows/moneygap.yml
name: MoneyGap
on:
  pull_request:
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npx --yes moneygap-scan@latest https://your-preview.example.com
```

Offline project scan: `npx moneygap init && npx moneygap scan` (exit `1` on critical/high by default).

See [`docs/moneygap.workflow.example.yml`](docs/moneygap.workflow.example.yml) and the composite action under `.github/actions/moneygap-scan` in the MoneyGap AI repo.

## Publish

```bash
cd packages/moneygap-diagnostics && npm run build
cd ../moneygap-cli && npm install && npm run build
npm publish --access public
```

Ensure `moneygap-diagnostics` is published first (or bundled) so the file: dependency resolves for consumers — for npm publish, prefer publishing `moneygap-diagnostics` to the registry and changing the dependency to a version range.

## License

MIT
