# Developer guide

## Package layout

```
src/
  index.ts          # Commander entry + public exports
  commands/         # init, scan, doctor, report, fix, auth, version, update, config
  analyzers/        # six heuristics + run-scan pipeline
  frameworks/       # detectFramework
  reporters/        # terminal + file reporters
  rules/            # finding helpers
  scoring/          # MoneyGap Score™ math
  plugins/          # registerAnalyzer / registerReporter
  providers/        # AIProvider stubs
  config/           # Zod loader
  types/
  utils/
tests/
  fixtures/         # tiny projects for smoke tests
```

## Programmatic use

```ts
import { registerAnalyzer } from "@moneygap/cli";

registerAnalyzer({
  id: "custom",
  category: "growth",
  async run() {
    return [];
  },
});
```

AI stubs:

```ts
import { providers } from "@moneygap/cli";
// await providers.openai.complete("…") → throws until API keys exist
```

## CI sample

```yaml
# .github/workflows/moneygap.yml (example — not required in app CI)
name: MoneyGap
on: [push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm install -g @moneygap/cli
      - run: moneygap scan
```

Exit `1` fails the job when critical/high findings exist (configurable via `failOnSeverity`).
