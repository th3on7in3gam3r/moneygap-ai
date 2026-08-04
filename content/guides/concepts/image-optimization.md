---
title: "Image Optimization"
description: "Serve responsive, correctly sized images that protect LCP and bandwidth."
difficulty: intermediate
tags:
  - images
  - lcp
  - webp
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Problem Overview

Unoptimized images are a top cause of slow LCP and wasted data. Missing dimensions also cause layout shift.

## Why It Matters

Images dominate bytes on most marketing sites. Better formats, sizes, and priority hints move Core Web Vitals and conversion.

## Common Mistakes

- Shipping multi-megabyte hero PNGs
- Omitting width/height (CLS)
- Lazy-loading the LCP image
- Ignoring modern formats (AVIF/WebP) with fallbacks

## Validation Checklist

- [ ] LCP image not lazy-loaded; consider `fetchpriority="high"`
- [ ] Width/height or CSS aspect-ratio reserved
- [ ] Responsive `srcset` / framework image component
- [ ] Compression and modern formats where supported

## AI Readiness Notes

Descriptive filenames and alt text improve both a11y and AI understanding of visual content.
