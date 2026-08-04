---
title: "llms.txt"
description: "Publish AI crawler guidance describing your organization and canonical resources."
difficulty: beginner
tags:
  - llms
  - ai
cliCommands:
  - "moneygap generate llms"
  - "moneygap validate llms"
  - "moneygap scan"
updated: "2026-08-04"
---

## Problem Overview

AI assistants and emerging crawlers often lack a dedicated guidance file for your brand. Without `llms.txt`, they guess from scattered pages.

## Why It Matters

A well-structured `llms.txt` documents organization, summary, products, and preferred URLs — improving AI Readiness and reducing hallucinated links.

## Common Mistakes

- Empty or placeholder-only files
- Relative URLs instead of absolute `https://` links
- Missing Organization / Summary / Important URLs sections
- Never updating after product changes

## Validation Checklist

- [ ] File served at `/llms.txt` (or `public/llms.txt` in static apps)
- [ ] Required sections present with real content
- [ ] Absolute https URLs for key resources
- [ ] Passes `moneygap validate llms`

## AI Readiness Notes

`llms.txt` is a first-class AI Readiness signal in MoneyGap. Pair it with Organization and FAQ schema for stronger entity clarity.

## Browser Extension Tips

After publishing, re-scan the live origin and share a report so teammates can verify guidance quality from the browser.
