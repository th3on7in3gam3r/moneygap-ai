# Growth Badge™ & Verification

## Mission

Let businesses and agencies that use MoneyGap AI display a branded Growth Badge™ on their websites. Visitors can verify the badge and see observed MoneyGap Score™ journey context. Attribution spreads MoneyGap naturally across the internet.

## Phase

Step 4 — Growth Badge & Verification System (partner foundation schema stubs only).

## Principles

- Observed scores and journey deltas — **AI Estimates**, not legal certification or guaranteed ROI.
- Soft-fail: missing snapshots/reports never break badge create; journey may show “—”.
- Does **not** rewrite MoneyGap Score™ or Opportunity Index™.
- Distinct from Marketplace “Verified” partners (editorial) and agency share links.

## Badge styles

1. Growth Optimized by MoneyGap AI™ (`growth_optimized`)
2. Analyzed & Improved with MoneyGap AI™ (`analyzed_improved`)
3. Website Growth Intelligence by MoneyGap AI™ (`growth_intelligence`)

## Public IDs

Format `MG-######` (six digits), unique on `growth_badges.public_id`.

## Routes

| Path | Role |
| --- | --- |
| `/dashboard/badge` | Generator, preview, embed copy, journey refresh, revoke |
| `/verify/[badgeId]` | Public verification page |
| `/api/growth-badge` | List / create (auth) |
| `/api/growth-badge/[publicId]/journey` | Refresh Growth Journey |
| `/api/growth-badge/[publicId]/revoke` | Revoke |
| `/api/badge/[publicId]/svg` | Public SVG for embeds |

## Embed

HTML works for WordPress, Shopify, Webflow, and custom sites:

```html
<a href="https://www.moneygap-ai.com/verify/MG-123456" target="_blank" rel="noopener noreferrer">
  <img src="https://www.moneygap-ai.com/api/badge/MG-123456/svg" alt="…" width="220" height="56" />
</a>
```

Paste in footer / theme liquid / custom code embeds.

## Growth Journey

`trackGrowth()` sets before/after from `score_snapshots` when available, else first vs latest `reports.moneyGapScore`. Stores `beforeScore`, `afterScore`, `improvementPoints` on the badge.

## Partner Foundation stubs

Tables `partner_profiles` and `partner_referrals` reserve referral/certified partner architecture. **No partner UI in this pass.** White-label reports remain via `agencyBrandSettings` + `white_label_reports` entitlement.

## Code map

- `src/lib/growth-badge/` — generate, verify, embed, journey, svg, ids
- `src/components/growth-badge/` — generator, preview, embed, journey card
- `src/db/schema.ts` — `growth_badges`, `growth_badge_events`, partner stubs

## Related

- `docs/public-pages.md`, `docs/partner-program.md`, `docs/agency-platform.md`
- Public guide: `content/docs/growth-badge.md`
