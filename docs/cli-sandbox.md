# CLI Scan Tool & Free Sandbox

Programmatic live diagnostics for developers (`npx moneygap-scan`) and a homepage terminal sandbox for visitors — before full MoneyGap AI scans and Fix Paths™.

## Architecture

```
Visitor / CLI
    │
    ├─ Homepage SandboxTerminal ──► POST /api/public/sandbox-scan
    │                                      │
    └─ npx moneygap-scan <url> ────────────┤
                                           ▼
                              moneygap-diagnostics
                         (crawlability · schema · perf signals)
                                           │
                              localStorage mg_sandbox
                                           │
                         Clerk Start free → Analyze / Onboarding
                                           │
                              Full MoneyGap Engine™ (auth)
```

| Layer | Path |
| --- | --- |
| Shared diagnostics | [`packages/moneygap-diagnostics`](../packages/moneygap-diagnostics) |
| CLI (`moneygap-scan` / `moneygap`) | [`packages/moneygap-cli`](../packages/moneygap-cli) |
| App re-export | [`src/lib/public-diagnostics`](../src/lib/public-diagnostics) |
| Public API | [`src/app/api/public/sandbox-scan/route.ts`](../src/app/api/public/sandbox-scan/route.ts) |
| Homepage UI | [`src/components/marketing/sandbox-terminal.tsx`](../src/components/marketing/sandbox-terminal.tsx) |
| Progressive log helper | [`src/components/marketing/sandbox-terminal-log.ts`](../src/components/marketing/sandbox-terminal-log.ts) |
| Handoff | [`src/lib/public-diagnostics/sandbox-storage.ts`](../src/lib/public-diagnostics/sandbox-storage.ts) |

## Homepage progressive log

The sandbox UI times stage lines client-side while awaiting `POST /api/public/sandbox-scan` (fetch → crawlability → schema → perf → summarize). The final score and findings come from the real API payload — not simulated.

CLI already receives live `onStage` callbacks from `moneygap-diagnostics`. Streaming those stages to the browser (SSE) is a future extension; homepage v1 stays client-timed log + real final JSON.

## What the free scan checks

- **Crawlability** — robots.txt reachability + Disallow:/ rules; sitemap.xml presence
- **Schema** — JSON-LD parse, `@context` hint, common `@type`s
- **Performance signals** — image dimensions, lazy-load hints, Google Fonts preconnect  
  (Not lab Core Web Vitals / Lighthouse.)

Does **not** use Firecrawl, OpenAI, or write authenticated `analyses` rows.

## Rate limits (sandbox API)

| Window | Limit per IP |
| --- | --- |
| 1 hour | 5 |
| 24 hours | 20 |

Private / localhost targets are rejected (SSRF guard). HTML capped ~1.5MB; timeout 15s.

`/api/public/*` is not Clerk-protected ([`src/proxy.ts`](../src/proxy.ts)).

## CLI usage

```bash
# after publish
npx moneygap-scan https://example.com

# monorepo
cd packages/moneygap-diagnostics && npm run build
cd ../moneygap-cli && npm install && npm run build
node dist/index.js scan-url https://example.com
# or: npm link && moneygap-scan https://example.com
```

Offline project scan remains: `moneygap scan`.

## npm publish checklist

1. Build diagnostics: `cd packages/moneygap-diagnostics && npm run build`
2. Prefer publishing `moneygap-diagnostics` first, then change CLI dependency from `file:` to a semver range **or** keep bundling via tsup `noExternal` (already configured).
3. `cd packages/moneygap-cli && npm run build && npm publish --access public`
4. Verify: `npx moneygap-scan https://example.com`

Package name: **`moneygap-scan`**. Bins: `moneygap-scan`, `moneygap`.

## Fix Path™ gate

Sandbox shows **what** is wrong. Step-by-step Fix Paths™ require **Clerk Start free**, then a full AI scan from Analyze / onboarding. Successful sandbox runs store `mg_sandbox` in `localStorage` (URL, score, finding IDs) for prefill.

## Manual test checklist

- [ ] `moneygap-scan https://example.com` prints stages + score
- [ ] Homepage Run free scan → findings + Unlock Fix Paths CTA
- [ ] Bad / private URL → clear error
- [ ] 6th scan/hour → 429
- [ ] Start free → `/dashboard/analyze` shows sandbox banner + prefilled URL
- [ ] Onboarding website step prefills from sandbox when no saved URL
- [ ] `moneygap scan` (offline) still works
- [ ] Mobile: input, Run, Start free tappable

## Rollback

- Remove `<SandboxTerminal />` from homepage; restore previous hero preview.
- Delete or disable `/api/public/sandbox-scan`.
- Unset `moneygap-diagnostics` dependency if unused.
- CLI publish is independent — unpublished package simply keeps `npx` unavailable.
