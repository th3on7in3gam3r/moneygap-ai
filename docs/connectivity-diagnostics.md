# Connectivity Diagnostics

Staged preflight used by Pre-Scan Estimate and analysis start. Replaces the old
generic “We couldn’t reach that website.” catch-all.

## Pipeline (single pass, no retries)

1. URL syntax + SSRF (`validateAndNormalizeUrl`)
2. DNS (`dns.promises.lookup`)
3. TCP connect (port 443)
4. TLS handshake
5. Homepage GET with **manual** redirect following (never HEAD-only)
6. Cloudflare / WAF detection (headers + challenge body)
7. Classify timeout vs DNS vs TLS vs HTTP
8. GET `/robots.txt`
9. GET sitemap candidates (`Sitemap:` from robots, `/sitemap.xml`, `/sitemap_index.xml`)
10. Framework sniff + page estimate

Implementation: [`src/lib/scan/connectivity/`](../src/lib/scan/connectivity/).

## Hard vs soft failures

**Hard (`ok: false`):** invalid URL, private host, DNS fail, TCP refused/timeout, TLS cert/handshake fail, homepage network/timeout, homepage 404/410/5xx.

**Soft (warnings only):** robots 404, sitemap 404, HTTP 401/403 (reachable but bot-gated), Cloudflare challenge with HTML returned, unknown framework.

## Structured result

APIs return `diagnostics` on success and failure:

```json
{
  "dns": "success",
  "tls": "success",
  "redirect": "301 -> https://www.example.com",
  "homepage": "200",
  "robots": "200",
  "sitemap": "404",
  "detectedFramework": "nextjs",
  "estimatedPages": 186,
  "warnings": ["sitemap.xml not found (404)."],
  "errors": [],
  "summary": "Website reachable. sitemap.xml not found (404).",
  "technical": { "stages": [], "fetches": [] }
}
```

User-facing copy uses `summary` (actionable). Expandable **Technical details** in
the Analyze / onboarding UI shows stage rows from `technical.stages`.

## Logging

Every outbound call emits `connectivity_fetch` via `log()`:

- `url`, `method`, `status`, `redirectCount`, `elapsedMs`
- On failure: `timeoutReason`, `error`, `code`, `kind`, `stack`

No `withRetry` around connectivity fetches.

## Wiring

| Entry | Behavior |
|-------|----------|
| `POST /api/scan/estimate` | Runs pipeline; returns `estimate` + `diagnostics` |
| `verifyUrlReachable` | Thin wrapper → pipeline; used by analysis / onboarding / v1 |
| Pre-Scan Estimator | Uses diagnostics for framework, pages, warnings |
