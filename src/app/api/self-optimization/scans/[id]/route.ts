import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationFindings,
  selfOptimizationScans,
  selfOptimizationScores,
} from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const [scan] = await db
      .select()
      .from(selfOptimizationScans)
      .where(eq(selfOptimizationScans.id, id))
      .limit(1);
    if (!scan || scan.workspaceId !== workspace.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const [scores] = await db
      .select()
      .from(selfOptimizationScores)
      .where(eq(selfOptimizationScores.scanId, scan.id))
      .limit(1);

    const findings = await db
      .select()
      .from(selfOptimizationFindings)
      .where(eq(selfOptimizationFindings.scanId, scan.id));

    return Response.json({
      scan: {
        id: scan.id,
        status: scan.status,
        targetUrl: scan.targetUrl,
        summary: scan.summary,
        error: scan.error,
        reportId: scan.reportId,
        websiteId: scan.websiteId,
        createdAt: scan.createdAt.toISOString(),
        finishedAt: scan.finishedAt?.toISOString() ?? null,
      },
      scores: scores ?? null,
      findings,
    });
  } catch {
    return Response.json({ error: "Could not load scan" }, { status: 500 });
  }
}
