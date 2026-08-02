# Cookie Intelligence™

## Rule

**No fake cookies.** Only verified first-party catalog entries plus observed `document.cookie` / server cookie jar / localStorage keys.

## Catalog (`src/lib/privacy/cookie-catalog.ts`)

Includes Clerk session cookies, `mg_consent`, `mg_demo_mode`, and `theme` (localStorage / personalization).

Optional Performance / Analytics / Product Improvement categories exist for consent gates but **do not** invent cookie rows until scripts ship.

## Inventory fields

Name · Purpose · Category · Expiration · Secure · HttpOnly · SameSite · Encrypted · Provider · Status (`active` | `configured_not_present` | `not_currently_loaded`) · Kind (cookie | localStorage)

## UI

Privacy Center™ table + Developer Mode™ technical notes pointing to the same inventory.
