---
title: "Image Optimization in Astro"
description: "Serve responsive, correctly sized images that protect LCP and bandwidth. Framework notes for Astro."
difficulty: intermediate
tags:
  - images
  - lcp
  - webp
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

Use `<Image />` from `astro:assets` in **Astro** so you get modern formats, sizing, and lazy-loading defaults — then override for LCP heroes.

## Step-by-Step Solution

1. Replace raw `<img>` heroes with the framework image component where possible.
2. Set explicit dimensions; disable lazy load on LCP.
3. Compress source assets before upload.
4. Verify LCP in lab + field after deploy.

## Code Examples

```html
<img
  src="/hero.avif"
  srcset="/hero-800.avif 800w, /hero-1200.avif 1200w"
  sizes="(max-width: 768px) 100vw, 1200px"
  width="1200"
  height="630"
  alt="Dashboard overview"
  fetchpriority="high"
/>
```

## Deployment Checklist

- [ ] Heroes under a sensible byte budget
- [ ] No layout shift from late image loads
- [ ] CDN image transforms configured if used

## Browser Extension Tips

After shipping image work, re-share an extension report to show score movement.
