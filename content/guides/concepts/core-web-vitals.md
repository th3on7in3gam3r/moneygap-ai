---
title: "Core Web Vitals"
description: "Improve LCP, INP, and CLS for real-user experience and search signals."
difficulty: intermediate
tags:
  - lcp
  - inp
  - cls
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Problem Overview

Core Web Vitals measure how quickly the main content appears (LCP), how responsive the page feels (INP), and how stable the layout is (CLS). Poor vitals frustrate users and can limit visibility in search experiences that factor page experience.

## Why It Matters

Slow or janky pages increase bounce rates and lower conversion. Fixing vitals is often the highest-leverage performance work for marketing and product sites.

## Common Mistakes

- Optimizing lab scores while ignoring field (CrUX) data
- Lazy-loading the LCP image
- Injecting late-loading banners that shift content (CLS)
- Shipping huge client bundles that delay interaction (INP)

## Validation Checklist

- [ ] LCP element identified and prioritized (preload / priority hints)
- [ ] Images have dimensions or aspect-ratio reserved
- [ ] Third-party scripts deferred or limited
- [ ] Field data reviewed in Search Console or CrUX

## AI Readiness Notes

Faster, stable pages are easier for AI crawlers and users to consume. Pair vitals work with clear structure and metadata so assistants can extract meaning after the page loads quickly.
