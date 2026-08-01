# Production Checklist

## Mission

Ship MoneyGap AI with accuracy, reliability, trust, and customer confidence—not feature sprawl.

## Deployment

- [ ] `DATABASE_URL`, Clerk, Firecrawl, OpenAI set in production
- [ ] `npm run db:push` (or migrations) applied
- [ ] `CRON_SECRET` set for Monitor + Agency crons
- [ ] Health check path: `/api/health`
- [ ] Bind to `0.0.0.0:$PORT` (Render)
- [ ] No secrets in client bundles
- [ ] `INTEGRATION_ENCRYPTION_KEY` set (32-byte base64) for Integration Hub™ credential vault

## Security

- [ ] API keys stored hashed only (`api_keys.key_hash`)
- [ ] Integration Hub credentials encrypted at rest (never plaintext tokens in DB)
- [ ] Workspace isolation on all report/API queries
- [ ] Rate limits on API keys
- [ ] Zod/input validation on public endpoints
- [ ] `MAINTENANCE_MODE` tested (dashboard + `/api/v1` 503)

## Performance

- [ ] Analysis soft-fails do not hang indefinitely
- [ ] Retry helper used for transient OpenAI/Firecrawl failures
- [ ] Avoid N+1 on report load paths for opportunities

## Launch

- [ ] Trust Engine enabled (`FEATURE_TRUST_ENGINE=1` or default on)
- [ ] Sample report shows confidence level + evidence
- [ ] Billing soft-switch works for plan gates
- [ ] Agency white-label + share links smoke-tested
- [ ] Production checklist reviewed by owner

## Monitoring

- [ ] `/api/health` returns `{ ok: true }`
- [ ] `/dashboard/system` shows flags + recent failure counts
- [ ] Structured logs include `analysisId` / `workspaceId` on pipeline errors
- [ ] Cron Monitor + Agency report jobs authenticated

## Rollback

1. Set `MAINTENANCE_MODE=1` if needed
2. Set `FEATURE_TRUST_ENGINE=0` to skip Trust pass (Engine persist still works)
3. Redeploy previous known-good release
4. Verify `/api/health` and a known report URL
5. Clear maintenance mode

## Related docs

- `docs/trust-engine.md`
- `docs/monetization.md`
- `docs/api-platform.md`
- `docs/vision.md`
- `docs/platform-1.0.md` — Phase 23 Launch Center maps this checklist to live probes
- `docs/operations.md`
- `docs/security.md`
