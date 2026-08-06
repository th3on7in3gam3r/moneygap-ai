# MoneyGap Categories™ (Golden Master v2)

## Purpose

Customer-facing growth intelligence is organized into **seven MoneyGap Categories™**.

The MoneyGap Engine™ still runs **eleven modules** under the hood. Categories are a **presentation lens** — not a second scoring engine.

## Mapping

| MoneyGap Category™ | Engine modules |
| --- | --- |
| Revenue Gap Intelligence™ | `revenue` |
| Offer Gap Intelligence™ | `marketing` |
| Conversion Gap Intelligence™ | `conversion`, `automation` |
| Trust Gap Intelligence™ | `trust`, `authority`, `customer` |
| Content Gap Intelligence™ | `content` |
| AI Visibility Gap Intelligence™ | `ai` |
| Technical Gap Intelligence™ | `seo`, `competitive` |

Code: [`src/lib/moneygap/categories.ts`](../src/lib/moneygap/categories.ts)

Category score bars average constituent module scores. Finding counts group by mapped `moduleId`.

## Product score

In-app surfaces keep the name **MoneyGap Score™** (higher = more uncaptured opportunity). Marketing may say “Growth Score” as a synonym; do not rename the in-product metric.

## Growth Recipe™

Each opportunity card frames:

1. Problem  
2. Opportunity  
3. Estimated opportunity  
4. Why missing  
5. Recommended fix  
6. AI implementation prompt (IDE Prompt / Fix Paths)

## My Websites™

`/dashboard/websites` shows per-site MoneyGap Score™, open gaps, last scan, and CTAs: View Report, Growth Plan, Run New Scan.

## Related

- [`moneygap-engine.md`](./moneygap-engine.md) — module engine of record  
- [`scoring-system.md`](./scoring-system.md) — Opportunity Index™  
