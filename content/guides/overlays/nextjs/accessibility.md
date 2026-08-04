---
title: "Accessibility in Next.js"
description: "Ship semantic HTML, labels, and media alternatives that work for everyone. Framework notes for Next.js."
difficulty: intermediate
tags:
  - a11y
  - wcag
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Framework-Specific Explanation

**Next.js** components should preserve semantics — prefer native elements over div soups, and ensure routing libraries expose real links.

## Step-by-Step Solution

1. Audit key templates for landmarks (`main`, `nav`).
2. Fix images and inputs missing alt/labels.
3. Normalize heading hierarchy.
4. Keyboard-test primary CTAs and dialogs.

## Code Examples

```html
<label for="email">Work email</label>
<input id="email" name="email" type="email" autocomplete="email" />
<img src="/chart.png" width="800" height="450" alt="Revenue trend over 12 months" />
```

## Deployment Checklist

- [ ] Automated a11y checks in CI when available
- [ ] Manual keyboard pass on signup and pricing
- [ ] `moneygap scan` a11y findings reviewed

## Browser Extension Tips

Capture a Fix Path™ share for accessibility items assigned to design/engineering.
