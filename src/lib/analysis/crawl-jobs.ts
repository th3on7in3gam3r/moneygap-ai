import { eq } from "drizzle-orm";
import { db } from "@/db";
import { crawlJobs } from "@/db/schema";

/** Enqueue a Deep Scan for the Render crawl worker. */
export async function enqueueDeepCrawlJob(input: {
  url: string;
  analysisId?: string;
  maxPages?: number;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(crawlJobs)
    .values({
      url: input.url,
      analysisId: input.analysisId ?? null,
      mode: "deep",
      maxPages: input.maxPages ?? 200,
      status: "queued",
    })
    .returning({ id: crawlJobs.id });

  return { id: row.id };
}

export async function getCrawlJob(id: string) {
  return db.query.crawlJobs.findFirst({
    where: eq(crawlJobs.id, id),
  });
}
