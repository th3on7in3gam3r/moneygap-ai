# AI Publishing Engine™

## Role

Assist editors inside Growth Academy™ CMS. Generation is draft-only.

## What AI can produce

- SEO titles and meta descriptions
- Full article markdown
- FAQ blocks (for FAQ schema when published)
- CTA suggestions
- Internal link suggestions
- External citation suggestions
- Social posts and newsletter copy
- Image prompts
- Schema notes

## Endpoint

`POST /api/growth-academy/generate` with `{ topic, angle?, categoryHint?, categoryId? }`.

Requires `OPENAI_API_KEY`. Soft-fails with a clear error when missing.

## Guardrails

- Never claim content is live
- Always append human-review framing in generated markdown
- Label impact language as AI Estimate
- Editors must publish explicitly from the CMS
