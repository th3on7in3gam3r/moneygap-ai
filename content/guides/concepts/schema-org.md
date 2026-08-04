---
title: "Schema.org"
description: "Add machine-readable JSON-LD so search and AI systems understand entities."
difficulty: intermediate
tags:
  - json-ld
  - structured-data
cliCommands:
  - "moneygap scan"
updated: "2026-08-04"
---

## Problem Overview

Without structured data, crawlers and assistants infer your product from HTML alone. Schema.org JSON-LD makes entities explicit.

## Why It Matters

Structured data improves rich-result eligibility and AI extractability — Organization, WebSite, SoftwareApplication, Article, FAQPage, and more.

## Common Mistakes

- Invalid JSON in `application/ld+json` scripts
- Marking up content that is not visible on the page
- Missing `@context` or wrong `@type`
- Duplicating conflicting entities across layouts

## Validation Checklist

- [ ] Valid JSON-LD in the document
- [ ] Types match visible content
- [ ] Organization present sitewide
- [ ] Tested with a rich-results / schema validator

## AI Readiness Notes

Schema.org is a core AI Readiness input. Prefer JSON-LD over microdata for maintainability.
