# @moneygap/cli

Offline developer CLI for Money Gaps™ detection: SEO, AI visibility (AEO), performance heuristics, accessibility, trust, and revenue readiness — with a MoneyGap Score™ terminal UI.

**Requires Node.js 22+.** Scans are filesystem/HTML/config heuristics only (no headless Chrome / Lighthouse).

## Install

```bash
# from monorepo
cd packages/moneygap-cli && npm install && npm run build
npm link   # optional global `moneygap`

# or run without build
npm run moneygap -- scan
```

## Quickstart

```bash
moneygap init
moneygap doctor
moneygap scan
moneygap report
moneygap fix
```

## Commands

| Command | Purpose |
| --- | --- |
| `moneygap init` | Write `moneygap.config.ts` + `.moneygapignore` |
| `moneygap scan` | Detect framework → analyzers → TUI score; write `.moneygap/last-scan.json` |
| `moneygap doctor` | Node/config/framework/plugin smoke checks |
| `moneygap report` | JSON / Markdown / HTML under `.moneygap/reports/` |
| `moneygap fix` | Recommendation markdown only (`--apply` refused without `--yes`; still no auto-overwrite) |
| `moneygap auth` | Stub for future cloud login |
| `moneygap version` | Package version |
| `moneygap update` | Soft-check npm registry |
| `moneygap config` | Show / `--validate` / `--path` |

Global option: `--cwd <path>`.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | OK |
| `1` | Findings at/above fail threshold (default: critical/high) |
| `2` | Tool error |

## Config

`moneygap.config.ts` (Zod-validated):

```ts
export default {
  projectName: "My App",
  ignore: ["**/node_modules/**", "**/.next/**"],
  weights: { seo: 1, aeo: 1, performance: 1, accessibility: 1, trust: 1, growth: 1 },
  rules: { disable: [] },
  failOnSeverity: ["critical", "high"],
};
```

## Docs

See [`docs/`](./docs/) for architecture, commands, contributing, roadmap, and developer guide.

## License

MIT
