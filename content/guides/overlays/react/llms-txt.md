---
title: "llms.txt in React"
description: "Publish AI crawler guidance describing your organization and canonical resources. Framework notes for React."
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

## Framework-Specific Explanation

For **React**, serve `llms.txt` from the static root or CDN origin. MoneyGap CLI defaults to writing `public/llms.txt` for static serving.

## Step-by-Step Solution

1. Run `moneygap generate llms` (or create the file in the dashboard AI Readiness flow).
2. Fill Organization, Summary, and Important URLs with absolute https links.
3. Deploy so `GET /llms.txt` returns the file.
4. Run `moneygap validate llms` and fix errors.

## Code Examples

```bash
moneygap generate llms --out public/llms.txt
moneygap validate llms
moneygap scan
```

## Deployment Checklist

- [ ] `/llms.txt` returns 200 with `text/plain` (or markdown)
- [ ] Validation score ≥ 70
- [ ] Update Information section refreshed on release

## Browser Extension Tips

After go-live, share a report and point teammates to AI Readiness if the score is low.
