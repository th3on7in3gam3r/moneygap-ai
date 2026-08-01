# AI Prompt Standards

## Absences first

Modules must identify **what is missing**, not inventory what already works — except as brief contrast.

## Business outcome chain

Every technical signal must map to:

Visibility → Traffic → Leads → Customers → Revenue

## Estimate language

- Always frame as **AI Estimate** / **Estimated Opportunity**
- Include rationale based on visible content, industry, model, and comparable patterns
- Never claim certainty or guaranteed ROI
- Include the standard disclaimer in UI (see `report-framework.md`)

## Fix structure

Every finding should include recommendations in three tiers when applicable:

1. **Quick Wins** (`quick_win`)
2. **Medium Effort** (`medium`)
3. **Long-Term Strategy** (`long_term`)

Each fix: action, difficulty, estimated time, priority, expected impact, optional resources.

## Module prompts

Each module prompt must:

- State the module mission
- List domain-specific absence catalog
- Require the shared finding JSON schema
- Ban SEO-only recommendations without business impact
- Prefer 2–5 high-value findings per module (avoid laundry lists)

## Models

Default: `OPENAI_MODEL` or `gpt-4o` via OpenAI Responses API with strict JSON schema.
