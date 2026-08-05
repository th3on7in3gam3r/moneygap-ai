import { pathToFileURL } from "node:url";
import { crawlSite } from "./crawl.js";

type JobRow = {
  id: string;
  url: string;
  mode: string;
  max_pages: number;
  status: string;
};

async function withPg<T>(
  fn: (client: {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: T[] }>;
    end: () => Promise<void>;
  }) => Promise<void>,
): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("crawl-worker: DATABASE_URL missing");
    process.exit(1);
  }
  // Dynamic import so package builds without pg as hard dependency
  let Client: new (cfg: { connectionString: string }) => {
    connect: () => Promise<void>;
    query: (sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
    end: () => Promise<void>;
  };
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
    const res = await client.query(
      `UPDATE crawl_jobs
       SET status = 'processing', started_at = NOW(), updated_at = NOW()
       WHERE id = (
         SELECT id FROM crawl_jobs
         WHERE status IN ('queued', 'retry')
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, url, mode, max_pages, status`,
    );
    claimed = (res.rows[0] as JobRow) ?? null;
  });
  return claimed;
}

async function completeJob(id: string, ok: boolean, error?: string, pageCount?: number) {
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

async function tick() {
  const job = await claimJob();
  if (!job) return;

  console.log(`crawl-worker: processing ${job.id} ${job.url}`);
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
    // Persist page rows when table exists
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
    await completeJob(job.id, result.scraped.length > 0, undefined, result.scraped.length);
  } catch (err) {
    await completeJob(job.id, false, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  const pollMs = Number(process.env.CRAWL_WORKER_POLL_MS || 5000);
  console.log(`crawl-worker: started (poll ${pollMs}ms)`);
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

export { main as runCrawlWorker };
