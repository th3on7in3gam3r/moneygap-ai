# Scan Engine V3 — enable checklist

Production app is on **Vercel** (`moneygap-ai.com`). Long stages must run on a **Render worker**. Tables are already applied in Neon.

## 1) Vercel (web control plane)

Dashboard → Project → Settings → Environment Variables → **Production** (and Preview if you want):

| Key | Value |
|-----|--------|
| `SCAN_ENGINE_V3` | `1` |

Keep existing `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CRON_SECRET`, crawl keys.

**Redeploy** Production after saving (Deployments → … → Redeploy).

How you know it worked: create a Basics scan → redirect to `/dashboard/scans/<id>` (not `/dashboard/analyze/<id>`).

## 2) Render — `moneygap-scan-worker`

Blueprint already defines this in `render.yaml`.

### If the service does not exist yet
1. Render Dashboard → Blueprint / sync from repo, **or**
2. New → Background Worker from this repo:
   - **Name:** `moneygap-scan-worker`
   - **Build:** `npm install && npm run build --prefix packages/moneygap-scan-engine`
   - **Start:** `npx tsx scripts/scan-engine-worker.ts`
   - **Plan:** Starter (always on)

### Env vars (required)

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Same Neon URL as Vercel (use **non-pooling** or pooler is fine for worker) |
| `SCAN_ENGINE_V3` | `1` |
| `OPENAI_API_KEY` | Same as Vercel |
| `OPENAI_MODEL` | `gpt-4o` |
| `FIRECRAWL_API_KEY` | Same as Vercel |
| `APIFY_API_TOKEN` | Same as Vercel |
| `CRON_SECRET` | Same as Vercel |
| `APP_URL` | `https://moneygap-ai.com` |
| `NEXT_PUBLIC_APP_URL` | `https://moneygap-ai.com` |
| `SCAN_WORKER_POLL_MS` | `3000` |
| `CRAWL_WORKER_ENABLED` | `1` |
| `SCAN_EXECUTION` | `worker` |

Optional but useful: `SCRAPEDO_API_TOKEN` if you use scrape.do.

Deploy the worker. Logs should show:

```text
scan-engine-worker: starting { workerId: "...", pollMs: 3000 }
```

When a V3 job exists:

```text
scan-engine-worker: processed stage acquire
```

## 3) Keep crawl worker (optional but recommended)

Existing `moneygap-crawl-worker` can stay for page acquisition. Scan worker also runs acquire via the same providers; having both is OK (leases prevent double-work on V3 stages).

## 4) Verify before Deep

1. Set Vercel `SCAN_ENGINE_V3=1` + redeploy  
2. Confirm Render `moneygap-scan-worker` is **Live** with OpenAI + DB  
3. Run **Basics** on biblefunland.com  
4. Expect `/dashboard/scans/...` Command Center with real stage cards  
5. Confirm Neon has a `scan_jobs` row for that analysis  
6. Then try **Standard**, then **Deep**

## Rollback

Set `SCAN_ENGINE_V3=0` on Vercel **and** Render scan worker → redeploy. Legacy path returns. Tables stay inert.

## Do not

- Do not run Deep until Basics lands on `/dashboard/scans/...` with worker heartbeats  
- Do not enable V3 on web without a running scan worker (jobs will sit in “Waiting for worker”)
