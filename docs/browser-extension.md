# Browser Extension — marketing & waitlist

## Mission

Promote the MoneyGap AI Chrome extension while it is **Coming Soon**, capture email waitlist interest, and keep share-report pages linked back to `/extension`.

## Surfaces

| Surface | Path |
| --- | --- |
| Landing | `/extension` |
| Waitlist API | `POST /api/extension/waitlist` |
| Table | `extension_waitlist` |
| Features block | `/features#extension` |
| Footer | Extension → `/extension` |
| Homepage | Trust band line + link |
| Share reverse CTA | `/report/ext/[shareId]` |
| Public docs | `/docs/browser-extension` |

## Store URL switch

Set `NEXT_PUBLIC_EXTENSION_STORE_URL` to an `https://` Chrome Web Store listing when live. Landing then shows **Add to Chrome** instead of the waitlist form. Leave unset for Coming Soon.

Do not invent a store URL.

## Share ingest (already shipped)

- `POST /api/extension/reports` with `x-moneygap-extension: 1` (or optional `EXTENSION_SYNC_SECRET`)
- Public HTML: `/report/ext/[shareId]`

## Out of scope here

Building the Chrome package itself (separate repo / release). Paid ads.
