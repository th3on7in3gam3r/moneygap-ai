import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { cancelRunningAnalysis } from "@/lib/analysis/pipeline";
import { cancelScanCrawl } from "@/lib/scan/jobs";
import { cancelScanJob } from "@/lib/scan-engine/create-job";
import { isV3AnalysisMeta } from "@/lib/scan-engine/status";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const row = await db.query.websiteAnalyses.findFirst({
    where: and(eq(websiteAnalyses.id, id), eq(websiteAnalyses.userId, userId)),
    columns: { id: true, scanMeta: true, status: true, reportId: true },
  });
  if (!row) {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }

  if (isV3AnalysisMeta(row.scanMeta)) {
    if (row.status === "completed" && row.reportId) {
      return Response.json(
        { error: "Analysis already completed." },
        { status: 409 },
      );
    }
    await cancelScanJob(id);
    try {
      await cancelScanCrawl(id);
    } catch {
      /* soft-fail */
    }
    return Response.json({ ok: true, reason: "v3_cancelled" });
  }

  const result = await cancelRunningAnalysis({ analysisId: id, userId });

  if (result.reason === "not_found") {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }
  if (result.reason === "already_complete") {
    return Response.json(
      { error: "Analysis already completed." },
      { status: 409 },
    );
  }

  try {
    await cancelScanCrawl(id);
  } catch {
    // soft-fail
  }

  return Response.json({ ok: true, reason: result.reason });
}
