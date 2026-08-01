# Business Profile (Onboarding)

Collected during Intelligent Onboarding™ and stored for Growth Copilot™.

## Fields

- Company name  
- Industry  
- Business Model  
- Team size  
- Primary goals (multi-select)  
- Persona role (Founder, CEO, Developer, Marketing, Sales, Agency, Consultant, Operations)

## Storage

1. **`workspace_onboarding`** — durable onboarding row  
2. **Business Memory™** (`business_memory_entries`) via `seedBusinessProfileMemory` — keys like `company_name`, `industry`, `primary_goals`, `persona_role`, `primary_website` (source: `onboarding`)  
3. **Business goals** (`business_goals`) — maps goal chips to types (`revenue`, `seo`, `leads`, …)

## Copilot mode mapping

| Persona | Copilot mode |
|---------|--------------|
| founder, ceo, operations | `ceo` |
| marketing, sales | `marketing` |
| developer | `developer` |
| agency, consultant | `agency` |

## APIs

`POST /api/onboarding/profile` — upserts onboarding + memory + goals.

See also [docs/business-memory.md](./business-memory.md).
