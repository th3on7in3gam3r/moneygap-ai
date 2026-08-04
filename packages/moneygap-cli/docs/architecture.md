# Architecture

```
Commander commands → loadConfig (Zod) → detectFramework → analyzers (parallel) → scoring → terminal / artifacts
```

## Layers

1. **Config** — `moneygap.config.ts|js|json` via Zod; defaults when missing.
2. **Frameworks** — `package.json` deps + config files (Next, Nuxt, Remix, Astro, SvelteKit, Angular, Vite, Vue, React).
3. **Analyzers** — seven offline modules implementing `Analyzer` (`seo`, `aeo`, `performance`, `accessibility`, `trust`, `growth`, `aiReadiness`).
4. **Scoring** — severity penalties → category scores → weighted MoneyGap Score™ (0–100).
5. **Reporters** — terminal TUI; JSON/MD/HTML files; PDF stub throws.
6. **Plugins / AI** — `registerAnalyzer` / `registerReporter`; AIProvider stubs unused by default scan.
7. **AI Readiness** — `src/ai-readiness/` validate/generate llms.txt (mirrors SaaS `src/lib/ai-readiness`).

## Artifacts

- `.moneygap/last-scan.json` — last scan (schema versioned)
- `.moneygap/reports/` — `latest.{json,md,html}` plus timestamped copies
- `.moneygap/fixes/` — suggestion markdown only

## Offline stance

No network required for `scan`. `update` and future `auth`/`upload` are optional and soft-fail offline.
