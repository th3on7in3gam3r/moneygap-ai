# Contributing

## Setup

```bash
cd packages/moneygap-cli
npm install
npm test
npm run typecheck
npm run build
```

## Guidelines

- Keep analyzers **read-only** and offline (no Chrome/Lighthouse in v1).
- Shared finding shape via `finding()` in `src/rules/registry.ts`.
- Prefer `path.join` — no POSIX-only path assumptions.
- Add Vitest coverage for parsers, scoring, and framework fixtures.
- Do not call real AI APIs from default scan paths.

## Adding an analyzer

1. Implement `Analyzer` in `src/analyzers/`.
2. Register in `src/analyzers/index.ts`.
3. Add rule ids under `category/rule-name`.
4. Cover with a fixture HTML test.
