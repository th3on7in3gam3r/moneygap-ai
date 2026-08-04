# MoneyGap AI — Progressive Web App

Safe, incremental PWA support. No `next-pwa` / Workbox dependency. Auth, API routes, middleware (`src/proxy.ts`), and `next.config.ts` are unchanged.

## What was added

| Piece | Path | Purpose |
| --- | --- | --- |
| Manifest | `src/app/manifest.ts` | Install metadata (`/manifest.webmanifest`) |
| Service worker | `public/sw.js` | Static asset cache + offline shell |
| Offline shell | `public/offline.html` | Fallback when navigations fail offline |
| Registration + updates | `src/components/pwa/pwa-register.tsx` | Register SW; optional update prompt |
| Icons | `public/icon-*.png`, maskable variants | Existing brand icons + maskable pads |
| Root metadata | `src/app/layout.tsx` | `themeColor`, `appleWebApp`, `manifest` link |

## Caching policy

**Cached:** icons, logo, fonts, CSS/JS under `/_next/static/`, other static image/font/manifest files, `offline.html`.

**Never cached:** `/api/*`, Clerk/auth hosts, dashboard HTML, mutations, user data. Navigations are network-first; on failure the offline shell is shown (HTML responses are not stored).

## Feature flag

| Env | Behavior |
| --- | --- |
| unset | SW registers in **production** only |
| `NEXT_PUBLIC_PWA_ENABLED=true` | Enable in local/dev |
| `NEXT_PUBLIC_PWA_ENABLED=false` | Disable everywhere |

## Updates

New SW versions install in the background and wait. Users see “A new version is ready” and can **Update now** or **Later**. Reload only happens after they choose Update (via `SKIP_WAITING`).

## Rollback

1. Set `NEXT_PUBLIC_PWA_ENABLED=false` and redeploy, **or**
2. Remove `<PwaRegister />` from `src/app/layout.tsx` and delete/ignore `public/sw.js`.
3. In Chrome DevTools → Application → Service Workers → Unregister; Clear site data if needed.

`next.config.ts`, Clerk, and API behavior do not need to be reverted.

## Manual test checklist

- [ ] Production (or `NEXT_PUBLIC_PWA_ENABLED=true`): DevTools → Application → Manifest loads; icons resolve
- [ ] Chrome / Edge desktop: Install app / “Install MoneyGap”
- [ ] Android Chrome: Add to Home Screen; opens standalone
- [ ] iOS Safari: Add to Home Screen (limited SW; icons/splash via apple metadata)
- [ ] Offline: disable network → navigate → `offline.html` shell; `/api/*` still fails (expected)
- [ ] Update: bump `CACHE_VERSION` in `sw.js`, redeploy → banner appears; Update reloads once; Later keeps session
- [ ] Auth still works (sign-in, dashboard)
- [ ] Analyze / onboarding scans still work
- [ ] Extension / CLI unchanged (no shared PWA code paths)
