import { pathToFileURL } from "node:url";
import { crawlSite } from "./crawl.js";
import { extractSinglePage } from "./crawl.js";
import { classifyPageType } from "./discovery/prioritize.js";
import { toScrapedPage } from "./adapters/scraped-page.js";

type JobRow = {
  id: string;
  url: string;
  mode: string;
  max_pages: number;
  status: string;
  analysis_id: string | null;
};

type PageRow = {
  id: string;
  url: string;
  attempts: number;
};

type PgClient = {
  connect: () => Promise<void>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  end: () => Promise<void>;
};

const MAX_PAGE_ATTEMPTS = 3;
const EXTRACT_TIMEOUT_HINT_MS = 20_000;

async function withPg(
  fn: (client: PgClient) => Promise<void>,
): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("crawl-worker: DATABASE_URL missing");
    process.exit(1);
  }
  let Client: new (cfg: { connectionString: string }) => PgClient;
  try {
    const mod = (await import("pg")) as {
      default?: { Client: typeof Client };
      Client?: typeof Client;
    };
    Client = (mod.default?.Client ?? mod.Client)!;
  } catch {
    console.error("crawl-worker: install `pg` to run the deep crawl worker");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

async function claimJob(): Promise<JobRow | null> {
  let claimed: JobRow | null = null;
  await withPg(async (client) => {
    // Prefer product Engine jobs (analysis_id set) so user scans aren't starved by orphan deep jobs.
    const res = await client.query(
      `UPDATE crawl_jobs
       SET status = 'processing', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE id = (
         SELECT id FROM crawl_jobs
         WHERE status IN ('queued', 'retry')
         ORDER BY
           CASE WHEN analysis_id IS NOT NULL THEN 0 ELSE 1 END,
           created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, url, mode, max_pages, status, analysis_id`,
    );
    const row = res.rows[0];
    if (!row) {
      claimed = null;
      return;
    }
    claimed = {
      id: String(row.id),
      url: String(row.url),
      mode: String(row.mode ?? "deep"),
      max_pages: Number(row.max_pages ?? 200),
      status: String(row.status),
      analysis_id: row.analysis_id ? String(row.analysis_id) : null,
    };
  });
  return claimed;
}

async function completeJob(
  id: string,
  ok: boolean,
  error?: string,
  pageCount?: number,
) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_jobs
       SET status = $2,
           error = $3,
           page_count = COALESCE($4, page_count),
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id, ok ? "completed" : "failed", error ?? null, pageCount ?? null],
    );
  });
}

async function countQueuedPages(jobId: string): Promise<number> {
  let n = 0;
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT count(*)::int AS n FROM crawl_pages
       WHERE job_id = $1::uuid AND state IN ('queued', 'retry', 'processing')`,
      [jobId],
    );
    n = Number(res.rows[0]?.n ?? 0);
  });
  return n;
}

async function reclaimStale(jobId: string): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'retry' END,
           last_error = COALESCE(last_error, 'Stale processing reclaimed'),
           updated_at = NOW()
       WHERE job_id = $1::uuid
         AND state = 'processing'
         AND updated_at < NOW() - INTERVAL '20 seconds'`,
      [jobId, MAX_PAGE_ATTEMPTS],
    );
  });
}

async function claimPageBatch(
  jobId: string,
  limit: number,
): Promise<PageRow[]> {
  let pages: PageRow[] = [];
  await withPg(async (client) => {
    const res = await client.query(
      `UPDATE crawl_pages AS p
       SET
         state = 'processing',
         attempts = p.attempts + 1,
         updated_at = NOW()
       WHERE p.id IN (
         SELECT id
         FROM crawl_pages
         WHERE job_id = $1::uuid
           AND state IN ('queued', 'retry')
         ORDER BY created_at ASC
         LIMIT $2
       )
       AND p.state IN ('queued', 'retry')
       RETURNING p.id, p.url, p.attempts`,
      [jobId, limit],
    );
    pages = res.rows.map((r) => ({
      id: String(r.id),
      url: String(r.url),
      attempts: Number(r.attempts ?? 0),
    }));
  });
  return pages;
}

async function markPageCompleted(
  pageId: string,
  data: {
    title: string | null;
    markdown: string;
    pageType: string;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = 'completed',
           title = $2,
           markdown = $3,
           page_type = $4,
           metadata = $5::jsonb,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [
        pageId,
        data.title,
        data.markdown,
        data.pageType,
        JSON.stringify(data.metadata),
      ],
    );
  });
}

async function markPageFailed(
  pageId: string,
  error: string,
  retry: boolean,
): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = $2,
           last_error = $3,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [pageId, retry ? "retry" : "failed", error],
    );
  });
}

async function mirrorWebsitePage(input: {
  analysisId: string;
  url: string;
  pageType: string;
  title: string | null;
  markdown: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `INSERT INTO website_pages (analysis_id, url, page_type, title, markdown, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)`,
      [
        input.analysisId,
        input.url,
        input.pageType,
        input.title,
        input.markdown,
        JSON.stringify(input.metadata),
      ],
    );
  });
}

async function updateAnalysisProgress(input: {
  analysisId: string;
  stage: string;
  progress: number;
  pagesCompleted: number;
  pagesFailed: number;
  pagesDiscovered: number;
  currentUrl: string | null;
  scanPhase?: string;
}): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE website_analyses
       SET status = 'running',
           stage = $2,
           progress = $3,
           pages_completed = $4,
           pages_failed = $5,
           pages_discovered = GREATEST(COALESCE(pages_discovered, 0), $6),
           scan_phase = COALESCE($7, scan_phase, 'processing'),
           scan_meta = COALESCE(scan_meta, '{}'::jsonb)
             || jsonb_build_object(
               'scanStage', 'crawling',
               'execution', 'worker',
               'currentUrl', to_jsonb($8::text),
               'lastProgressAt', to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000)::bigint)
             ),
           error = NULL
       WHERE id = $1::uuid`,
      [
        input.analysisId,
        input.stage,
        input.progress,
        input.pagesCompleted,
        input.pagesFailed,
        input.pagesDiscovered,
        input.scanPhase ?? "processing",
        input.currentUrl,
      ],
    );
  });
}

async function failAnalysis(analysisId: string, message: string): Promise<void> {
  await withPg(async (client) => {
    await client.query(
      `UPDATE website_analyses
       SET status = 'failed',
           scan_phase = 'failed',
           stage = 'Failed',
           error = $2,
           completed_at = NOW()
       WHERE id = $1::uuid`,
      [analysisId, message],
    );
    await client.query(
      `UPDATE websites
       SET status = 'error', updated_at = NOW()
       WHERE id = (SELECT website_id FROM website_analyses WHERE id = $1::uuid)`,
      [analysisId],
    );
  });
}

async function countByState(jobId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT state, count(*)::int AS n
       FROM crawl_pages WHERE job_id = $1::uuid
       GROUP BY state`,
      [jobId],
    );
    for (const row of res.rows) {
      out[String(row.state)] = Number(row.n ?? 0);
    }
  });
  return out;
}

async function isAnalysisPaused(analysisId: string): Promise<boolean> {
  let paused = false;
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT scan_phase FROM website_analyses WHERE id = $1::uuid`,
      [analysisId],
    );
    const phase = String(res.rows[0]?.scan_phase ?? "");
    paused = phase === "paused" || phase === "cancelled" || phase === "failed";
  });
  return paused;
}

async function notifyScanComplete(analysisId: string): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  const origin = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!secret || !origin) {
    console.error(
      "crawl-worker: cannot notify scan complete — set APP_URL and CRON_SECRET",
      { analysisId, hasSecret: Boolean(secret), hasOrigin: Boolean(origin) },
    );
    return;
  }

  const url = `${origin}/api/scan/complete`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-cron-secret": secret,
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ analysisId }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("crawl-worker: scan complete HTTP", res.status, await res.text());
    } else {
      console.log("crawl-worker: post-crawl started", analysisId);
    }
  } catch (err) {
    console.error("crawl-worker: scan complete notify failed", err);
  }
}

/** Drain pre-enqueued crawl_pages for a product Engine analysis. */
async function processProductJob(job: JobRow): Promise<void> {
  const analysisId = job.analysis_id!;
  const concurrency = Math.min(
    8,
    Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 10)),
  );
  const deadline =
    Date.now() + Number(process.env.CRAWL_MAX_RUNTIME_MS || 15 * 60_000);

  console.log(
    `crawl-worker: product drain ${job.id} analysis=${analysisId} concurrency=${concurrency}`,
  );

  while (Date.now() < deadline) {
    if (await isAnalysisPaused(analysisId)) {
      console.log("crawl-worker: analysis paused/cancelled — releasing job", analysisId);
      await withPg(async (client) => {
        await client.query(
          `UPDATE crawl_jobs SET status = 'queued', updated_at = NOW() WHERE id = $1::uuid`,
          [job.id],
        );
      });
      return;
    }

    await reclaimStale(job.id);
    const batch = await claimPageBatch(job.id, concurrency);
    if (batch.length === 0) {
      const counts = await countByState(job.id);
      const remaining =
        (counts.queued ?? 0) + (counts.retry ?? 0) + (counts.processing ?? 0);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const completed = counts.completed ?? 0;
      if (completed === 0) {
        await failAnalysis(
          analysisId,
          "We couldn't analyze this website. Please confirm the URL is publicly accessible.",
        );
        await completeJob(job.id, false, "zero completed pages", 0);
        return;
      }
      await completeJob(job.id, true, undefined, completed);
      await updateAnalysisProgress({
        analysisId,
        stage: "Understanding business",
        progress: 32,
        pagesCompleted: completed,
        pagesFailed: counts.failed ?? 0,
        pagesDiscovered: completed + (counts.failed ?? 0),
        currentUrl: null,
        scanPhase: "analyzing",
      });
      await notifyScanComplete(analysisId);
      return;
    }

    await Promise.all(
      batch.map(async (page) => {
        try {
          const record = await extractSinglePage(page.url, {
            playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
            timeoutMs: EXTRACT_TIMEOUT_HINT_MS,
          });
          if (!record || record.markdown.trim().length < 40) {
            await markPageFailed(
              page.id,
              "thin or empty content",
              page.attempts < MAX_PAGE_ATTEMPTS,
            );
            return;
          }
          const scraped = toScrapedPage({
            ...record,
            pageType: classifyPageType(record.finalUrl || record.url, job.url),
          });
          const pageType = scraped.pageType;
          await markPageCompleted(page.id, {
            title: scraped.title,
            markdown: scraped.markdown,
            pageType,
            metadata: scraped.metadata,
          });
          await mirrorWebsitePage({
            analysisId,
            url: scraped.url,
            pageType,
            title: scraped.title,
            markdown: scraped.markdown,
            metadata: scraped.metadata,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await markPageFailed(
            page.id,
            msg,
            page.attempts < MAX_PAGE_ATTEMPTS,
          );
        }
      }),
    );

    const counts = await countByState(job.id);
    const completed = counts.completed ?? 0;
    const failed = counts.failed ?? 0;
    const discovered =
      completed +
      failed +
      (counts.queued ?? 0) +
      (counts.retry ?? 0) +
      (counts.processing ?? 0);
    const progress = Math.min(
      30,
      15 + Math.round((completed / Math.max(1, discovered)) * 15),
    );
    await updateAnalysisProgress({
      analysisId,
      stage: `Reading page ${completed} of ${discovered}…`,
      progress,
      pagesCompleted: completed,
      pagesFailed: failed,
      pagesDiscovered: discovered,
      currentUrl: batch[0]?.url ?? null,
      scanPhase: "processing",
    });
  }

  // Runtime budget hit — leave job queued for another worker loop.
  console.warn("crawl-worker: product job runtime budget hit — requeue", job.id);
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_jobs SET status = 'queued', updated_at = NOW() WHERE id = $1::uuid`,
      [job.id],
    );
  });
}

/** Legacy deep crawl: full site crawl when no page queue was pre-built. */
async function processLegacyDeepJob(job: JobRow): Promise<void> {
  console.log(`crawl-worker: legacy crawl ${job.id} ${job.url}`);
  try {
    const result = await crawlSite({
      url: job.url,
      mode: (job.mode as "quick" | "standard" | "deep") || "deep",
      maxPages: job.max_pages || 200,
      concurrency: Number(process.env.CRAWL_CONCURRENCY || 10),
      playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
      maxRuntimeMs: Number(process.env.CRAWL_MAX_RUNTIME_MS || 15 * 60_000),
      jobId: job.id,
    });
    await withPg(async (client) => {
      for (const page of result.scraped) {
        await client.query(
          `INSERT INTO crawl_pages (job_id, url, page_type, title, markdown, metadata, state)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'completed')
           ON CONFLICT DO NOTHING`,
          [
            job.id,
            page.url,
            page.pageType,
            page.title,
            page.markdown,
            JSON.stringify(page.metadata),
          ],
        );
      }
    });
    await completeJob(
      job.id,
      result.scraped.length > 0,
      undefined,
      result.scraped.length,
    );
    if (job.analysis_id && result.scraped.length > 0) {
      for (const page of result.scraped) {
        await mirrorWebsitePage({
          analysisId: job.analysis_id,
          url: page.url,
          pageType: page.pageType,
          title: page.title,
          markdown: page.markdown,
          metadata: page.metadata,
        });
      }
      await notifyScanComplete(job.analysis_id);
    }
  } catch (err) {
    await completeJob(
      job.id,
      false,
      err instanceof Error ? err.message : String(err),
    );
    if (job.analysis_id) {
      await failAnalysis(
        job.analysis_id,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

async function getAnalysisExecution(
  analysisId: string,
): Promise<string | null> {
  let execution: string | null = null;
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT scan_meta->>'execution' AS execution,
              scan_meta->>'crawlProvider' AS provider
       FROM website_analyses WHERE id = $1::uuid`,
      [analysisId],
    );
    const row = res.rows[0];
    execution =
      (row?.execution ? String(row.execution) : null) ||
      (row?.provider === "apify" ? "apify" : null);
  });
  return execution;
}

/** Kick MoneyGap /api/scan/tick so Apify polls advance on the web app. */
async function notifyApifyPoll(analysisId: string): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  const origin = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (!secret || !origin) {
    console.error(
      "crawl-worker: cannot poll Apify — set APP_URL and CRON_SECRET",
      { analysisId },
    );
    return;
  }
  const url = `${origin}/api/scan/tick`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-cron-secret": secret,
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ analysisId }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error("crawl-worker: apify tick HTTP", res.status, await res.text());
    } else {
      console.log("crawl-worker: apify tick ok", analysisId);
    }
  } catch (err) {
    console.error("crawl-worker: apify tick failed", err);
  }
}

async function tick() {
  const job = await claimJob();
  if (!job) return;

  if (job.analysis_id) {
    const execution = await getAnalysisExecution(job.analysis_id);
    if (execution === "apify") {
      console.log("crawl-worker: apify job — delegating poll to web tick", job.id);
      await notifyApifyPoll(job.analysis_id);
      // Keep job claimable if still queued; Apify path usually sets processing.
      await withPg(async (client) => {
        await client.query(
          `UPDATE crawl_jobs SET status = 'queued', updated_at = NOW() WHERE id = $1::uuid AND status = 'processing'`,
          [job.id],
        );
      });
      return;
    }

    const pending = await countQueuedPages(job.id);
    if (pending > 0) {
      await processProductJob(job);
      return;
    }
    // Analysis-linked job with no queue yet — wait briefly (discover may still enqueue).
    // Or run legacy crawl if discover already finished with zero URLs.
    await new Promise((r) => setTimeout(r, 2000));
    const again = await countQueuedPages(job.id);
    if (again > 0) {
      await processProductJob(job);
      return;
    }
  }

  await processLegacyDeepJob(job);
}

async function main() {
  const pollMs = Number(process.env.CRAWL_WORKER_POLL_MS || 5000);
  console.log(`crawl-worker: started (poll ${pollMs}ms, product+legacy)`);
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error("crawl-worker tick error", err);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}

export { main as runCrawlWorker, processProductJob, notifyScanComplete };
