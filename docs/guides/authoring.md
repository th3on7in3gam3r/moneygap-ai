# Authoring MoneyGap Guides

## Frontmatter (concept and overlay)

```yaml
---
title: Core Web Vitals in Next.js
description: Short SEO description.
difficulty: intermediate   # beginner | intermediate | advanced
tags: [lcp, cls, inp]
cliCommands:
  - moneygap scan
  - moneygap validate llms
updated: 2026-08-01
---
```

## Concept file (`content/guides/concepts/{topic}.md`)

Use shared headings (exact `##` titles matter for section mapping):

- `## Problem Overview`
- `## Why It Matters`
- `## Common Mistakes`
- `## Validation Checklist`
- `## AI Readiness Notes` (optional)
- `## Browser Extension Tips` (optional)

Do **not** put framework-specific steps or code in concepts.

## Overlay file (`content/guides/overlays/{framework}/{topic}.md`)

- `## Framework-Specific Explanation`
- `## Step-by-Step Solution`
- `## Code Examples`
- `## Common Mistakes` (optional extras; appended)
- `## Validation Checklist` (optional extras; appended)
- `## Deployment Checklist` (optional)
- `## AI Readiness Notes` / `## Browser Extension Tips` (optional)

## Publish rule

Topic must exist in `src/lib/guides/topics.ts`. Framework must exist in `frameworks.ts`. Both MD files required or the combo stays unpublished.

## Quality bar

Prefer one solid guide over stubs. Seed overlays should include real commands, file paths, and validation steps tied to MoneyGap CLI / AI Readiness where relevant.
