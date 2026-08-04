---
title: "Metadata in Astro"
description: "Titles, descriptions, and document head tags that shape SERP and social quality. Framework notes for Astro."
difficulty: beginner
tags:
  - title
  - description
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

**Astro** should emit titles and descriptions in the initial HTML. Prefer per-page frontmatter and `<head>` / SEO integrations so crawlers never depend on client hydration for head tags.

## Step-by-Step Solution

1. Define a default site title template.
2. Override per route with unique titles and descriptions.
3. Ensure canonical and social tags align with the primary URL.
4. Spot-check View Source (not only the DOM after hydration).

## Code Examples

```html
<title>Pricing — Acme Analytics</title>
<meta name="description" content="Simple plans for teams closing growth gaps. Start free." />
```

Wire these through per-page frontmatter and `<head>` / SEO integrations.

## Deployment Checklist

- [ ] Preview environments do not get indexed (robots / noindex as needed)
- [ ] Production titles match messaging
- [ ] `moneygap scan` reports no missing-title findings on key templates

## Browser Extension Tips

Open a key landing page and confirm the shared extension report lists metadata opportunities.
