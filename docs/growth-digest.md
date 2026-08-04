# MoneyGap Growth Digest™

Personalized weekly (or biweekly/monthly) email digests — growth report, not promo blast.

## Layout

```
src/lib/email/
  types.ts
  providers/          # EmailProvider + Resend adapter
  services/send.ts
  templates/          # HTML layout + growth-digest + cli-waitlist
  preferences/        # get/update/unsubscribe
  analytics/          # deliveries + events
  digest/             # DigestContentProvider + rule-based composer
  scheduler/          # due resolver + run job
```

## Channels (preferences)

| Channel | Default | v1 send |
| --- | --- | --- |
| Weekly Growth Digest | on | yes |
| AI Readiness Updates | off | prefs only |
| Developer Tips | off | prefs only |
| Product Updates | off | prefs only |
| Security Notifications | on | prefs only |
| Monthly Product Summary | off | prefs only |

Frequency: `weekly` | `biweekly` | `monthly` | `off` (+ IANA timezone).

## Content provider

`DigestContentProvider` builds `GrowthDigestPayload` from reports + `growth_briefs` + framework signals.

Swap in an OpenAI provider later without changing templates or cron.

## Cron

- `POST /api/cron/growth-digest` (`CRON_SECRET`)
- Render: `moneygap-growth-digest` daily `0 14 * * *` UTC
- Idempotency: `digest:{userId}:{YYYY-MM-DD}`

## UI

- `/dashboard/email` — Email Center (preview, test send, recent deliveries)
- `/dashboard/settings/email` — preferences
- `/api/email/unsubscribe?token=` — one-click marketing opt-out

## Webhooks

`POST /api/email/webhooks/resend` → `email_events` (+ delivery status).

Optional: `RESEND_WEBHOOK_SECRET`.

## CLI waitlist

- Page: `/cli`
- API: `POST /api/cli/waitlist`
- Table: `cli_cicd_waitlist`

## Env

- `RESEND_API_KEY` — **required** for sends (host Dashboard → Environment on the MoneyGap web service). Without it, deliveries are logged as `failed` with `RESEND_API_KEY is not configured.`
- `EMAIL_FROM` or `CONTACT_FROM_EMAIL` — verified domain From, e.g. `MoneyGap AI <hello@moneygap-ai.com>`
- `EMAIL_PROVIDER=resend` (default)
- `CRON_SECRET`, `APP_URL` / `NEXT_PUBLIC_APP_URL`
- Optional: `RESEND_WEBHOOK_SECRET` — Svix signing secret from Resend webhooks (**not** the `re_…` API key)

Blueprint (`render.yaml`) declares `RESEND_API_KEY`, `EMAIL_FROM`, and related keys as `sync: false` so they can be filled in the dashboard.

After setting keys on the production host, redeploy/restart the web service, then use Email Center → **Send test to me**.

## Extension points

1. Add Postmark/SES in `providers/` implementing `EmailProvider`
2. New template keys under `templates/`
3. New cron channels calling the same `sendEmail` + `recordDelivery`
4. AI digest: implement `DigestContentProvider` and inject in `scheduler/run.ts`
5. Welcome / nurture drafts: see [welcome-nurture.md](./welcome-nurture.md) (`EMAIL_WELCOME_LIVE`)
