# AI Readiness Engine™

## Mission

Measure and improve how ready a website is for AI assistants, answer engines, and LLM-powered search — without conflating this with MoneyGap Engine™ **AI Intelligence™** (`moduleId: ai`, opportunity polarity).

**AI Readiness** is a **health score** (higher = better): llms.txt quality, structured data, entity clarity, knowledge coverage, and contact/docs transparency.

## What it is not

- Not a 12th MoneyGap Engine opportunity module
- Not a legal certification or ROI guarantee
- Not a replacement for Crawlability Score™ or Self-Opt AI Visibility — it enriches them

## Core APIs (`src/lib/ai-readiness/`)

| Export | Role |
|--------|------|
| `validateLlmsFile(content)` | Structure/quality score, errors, warnings, suggestions |
| `generateLlmsFile(input)` | Markdown llms.txt (caller enforces overwrite policy) |
| `calculateAIReadiness(signals)` | 0–100 readiness score + breakdown |
| `detectKnowledgeResources(urls)` | Docs/help/faq/blog URL classification |

Rules are versioned via `RULESET_VERSION` in `rules/registry.ts` — extend rules without rewriting the engine.

## CLI (`@moneygap/cli`)

Seventh category: **AI Readiness**.

```bash
moneygap scan
moneygap generate llms [--force] [--out public/llms.txt]
moneygap validate llms [--path public/llms.txt]
```

`generate` refuses overwrite without `--force`. AEO no longer double-counts missing llms.txt.

## SaaS

- Dashboard: `/dashboard/ai-readiness`
- API: `GET/POST /api/ai-readiness`, `POST /api/ai-readiness/validate`
- Versions table: `ai_readiness_llms_versions`
- Crawlability + Self-Opt AI Visibility consume validation scores when `/llms.txt` is present

## Extension

Optional `scores.aiReadiness` on extension report wire format; public share page shows chip + “Generate AI Guidance File” CTA when low.

## Related

- `docs/crawlability-score.md`, `docs/moneygap-cli.md`, `docs/scoring-system.md`
- CLI docs: `packages/moneygap-cli/docs/`
