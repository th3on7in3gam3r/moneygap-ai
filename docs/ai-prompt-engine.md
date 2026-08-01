# AI Prompt Engine™

## Mission

Every Self Optimization finding ships ready-to-copy prompts for:

- Cursor
- ChatGPT
- Claude
- Gemini
- GitHub Copilot

## Properties

- Context-aware (product + target URL)
- Project-aware (MoneyGap constraints: no mock data, no auto-publish, AI Estimate)
- Specific to the finding’s Fix Path™ and evidence
- Actionable with verification checklist

## Code

`src/lib/self-optimization/prompts/generate.ts`

Regenerate: `GET /api/self-optimization/prompts/[findingId]`

## Standards

Aligns with `docs/ai-prompt-standards.md` (absences first, business outcome chain, estimate language).

## Related

- `docs/self-optimization.md`
- `docs/fix-paths.md`
