import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { scheduleScanTick } from "@/lib/scan/continue";
import { resumeScan } from "@/lib/scan/jobs";

export const maxDuration = 30;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const row = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
    columns: { id: true },
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const ok = await resumeScan(id);
  if (!ok) {
    return Response.json({ error: "Cannot resume this scan." }, { status: 400 });
  }

  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
    columns: { scanMeta: true, crawlJobId: true },
  });
  const execution =
    analysis?.scanMeta &&
    typeof (analysis.scanMeta as { execution?: unknown }).execution === "string"
      ? (analysis.scanMeta as { execution: string }).execution
      : null;

  if (execution === "worker" && analysis?.crawlJobId) {
    const { crawlJobs } = await import("@/db/schema");
    await db
      .update(crawlJobs)
      .set({ status: "queued", updatedAt: new Date() })
      .where(eq(crawlJobs.id, analysis.crawlJobId));
  } else {
    after(() => {
      void scheduleScanTick(id);
    });
  }

  return Response.json({ ok: true, scanPhase: "processing" });
}
