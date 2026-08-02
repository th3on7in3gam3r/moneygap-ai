# Smart Consent™

## Mission

Replace interruptive cookie banners with a trust-first preference experience that explains **what**, **why**, and **how it helps**.

## Categories

| Category | Locked | Loaded today |
| --- | --- | --- |
| Essential | Yes | Clerk auth, `mg_consent`, demo mode |
| Performance | No | Not loaded (gate ready) |
| Analytics | No | Not loaded (gate ready) |
| Personalization | No | Theme / UI prefs (`next-themes`) |
| Product Improvement | No | Not loaded (gate ready) |

## Visitor controls

Accept All · Reject Optional · Customize · Update anytime · Withdraw optional · Export preferences

## Persistence

- Cookie: `mg_consent` (HttpOnly, Secure in production, SameSite=Lax)
- DB: `privacy_consent_records` + `privacy_consent_events` (Consent Timeline™)
- Client mirror: `localStorage` key `mg_consent_client` for category gates

## Versions

`CONSENT_SCHEMA_VERSION` and `PRIVACY_POLICY_VERSION` in `src/lib/privacy/versions.ts` — bump when categories or policy material change.

## Counsel

Not legal advice. Organizations should review with counsel before production claims.
