# Welcome / nurture email sequence (drafts)

Addresses the MoneyGap **automation** gap “Missing Email Welcome/Nurture Sequences” for **moneygap-ai.com** (Opportunity Index™ **84**). Cited annual impact **~$50,000 is an AI Estimate — not a guarantee**.

## Goal

Minimal, reviewable 3-step welcome/nurture for new MoneyGap sign-ups / trial users — **without auto-sending** to production.

## Sequence

| Step | Template key | Offset | Channel | Purpose |
| --- | --- | --- | --- | --- |
| Day 0 | `welcome.day0` | 0 | `transactional` | Account welcome + first analysis CTA |
| Day 2 | `welcome.day2` | 2 | `product_updates` | Fix Paths™ tip |
| Day 7 | `welcome.day7` | 7 | `product_updates` | Growth Digest™ + trial value (AI Estimate disclaimer) |

## Draft vs live

1. **Enrollment** (`enrollWelcomeSequence`) runs when a **new workspace** is created in `ensureUserAndWorkspace`, or via Email Center → **Queue drafts for me**.
2. Creates `email_deliveries` rows with `status: queued`, `provider: none`, `meta.reviewStatus: pending`. **Never calls Resend** on enroll.
3. Humans review in **Email Center** (`/dashboard/email`):
   - Preview each step
   - **Send test to me** (explicit; soft-fails if Resend unset)
   - **Approve** — with default config only sets `reviewStatus: approved` (still queued)
4. Set `EMAIL_WELCOME_LIVE=1` to allow Approve to send via Resend. Day-2/7 require **Product updates** preference on.

## Code map

```
src/lib/email/sequences/welcome.ts      # catalog + payload + render
src/lib/email/sequences/enroll-welcome.ts
src/lib/email/templates/welcome-day{0,2,7}.ts
src/app/api/email/welcome/{preview,test,approve,enroll}/
src/app/dashboard/email/page.tsx         # Welcome card
```

## Env

| Variable | Role |
| --- | --- |
| `EMAIL_WELCOME_LIVE` | `1` = Approve may send; unset/false = approve-only drafts |
| `RESEND_API_KEY` | Required for test/live sends (soft-fail otherwise) |
| `EMAIL_FROM` | Verified From |

## Out of scope (v1)

- Clerk `user.created` webhook
- Cron that auto-sends day-2 / day-7 by calendar offset
- External CRM / ESP sync
- Changes to MoneyGap Score™ or Opportunity Index™ math

## Related

- [Growth Digest™](./growth-digest.md)
