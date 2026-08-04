---
title: "Accessibility"
description: "Ship semantic HTML, labels, and media alternatives that work for everyone."
difficulty: intermediate
tags:
  - a11y
  - wcag
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Problem Overview

Inaccessible pages exclude users and create legal and brand risk. Common gaps: missing alt text, unlabeled inputs, skipped heading levels, and no landmarks.

## Why It Matters

Accessibility expands audience reach and often improves SEO and AI extractability through clearer structure.

## Common Mistakes

- Icon-only buttons without accessible names
- Decorative images marked as content (or vice versa)
- Skipping heading levels for visual style
- Custom widgets without keyboard support

## Validation Checklist

- [ ] Images have meaningful `alt` (or empty alt if decorative)
- [ ] Form controls associated with labels
- [ ] One logical H1; no skipped levels
- [ ] Main and nav landmarks present
- [ ] Keyboard operable primary flows

## AI Readiness Notes

Semantic structure helps assistants segment roles of page regions. Treat a11y as part of machine readability, not only compliance.
