---
title: "Core Web Vitals in Astro"
description: "Improve LCP, INP, and CLS for real-user experience and search signals. Framework notes for Astro."
difficulty: intermediate
tags:
  - lcp
  - inp
  - cls
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

In **Astro**, Core Web Vitals are usually won or lost in the initial HTML and the LCP media path. Prefer server-rendered or statically generated shells, and avoid shipping unnecessary client JS on marketing routes.

## Step-by-Step Solution

1. Identify the LCP element in Chrome Performance / Web Vitals.
2. Prioritize that asset (preload / high fetch priority) and reserve space.
3. Defer non-critical JS and third parties.
4. Re-measure on staging with throttling and field data when available.

## Code Examples

```html
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high" />
<img src="/hero.avif" width="1200" height="630" alt="Product hero" fetchpriority="high" />
```

Use `<Image />` from `astro:assets` when available so the framework emits responsive `srcset` automatically.

## Deployment Checklist

- [ ] Production build analyzed for bundle weight
- [ ] CDN caching enabled for static assets
- [ ] No blocking font or script waterfall on the LCP route

## Browser Extension Tips

Run a quick extension scan on the live URL after deploy and share the Fix Path™ report with the team.
