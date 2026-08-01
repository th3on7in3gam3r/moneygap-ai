import { auth } from "@clerk/nextjs/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationScans,
  selfOptimizationScores,
} from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const scans = await db
      .select()
      .from(selfOptimizationScans)
      .where(eq(selfOptimizationScans.workspaceId, workspace.id))
      .orderBy(desc(selfOptimizationScans.createdAt))
      .limit(50);

    const scores =
      scans.length === 0
        ? []
        : await db
            .select()
            .from(selfOptimizationScores)
            .where(
              inArray(
                selfOptimizationScores.scanId,
                scans.map((s) => s.id),
              ),
            );
    const byScan = new Map(scores.map((s) => [s.scanId, s]));

    return Response.json({
      scans: scans.map((s) => {
        const score = byScan.get(s.id);
        return {
          id: s.id,
          status: s.status,
          targetUrl: s.targetUrl,
          summary: s.summary,
          error: s.error,
          overall: score?.overall ?? null,
          seo: score?.seo ?? null,
          estimatedOpportunity: score?.estimatedOpportunity ?? null,
          createdAt: s.createdAt.toISOString(),
          finishedAt: s.finishedAt?.toISOString() ?? null,
        };
      }),
    });
  } catch {
    return Response.json({ error: "Could not list scans" }, { status: 500 });
  }
}
