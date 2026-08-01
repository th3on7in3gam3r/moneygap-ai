import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationFindings,
  selfOptimizationScans,
} from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { generatePrompts } from "@/lib/self-optimization";
import { resolveSelfScanTarget } from "@/lib/self-optimization/config";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ findingId: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { findingId } = await ctx.params;

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const [finding] = await db
      .select()
      .from(selfOptimizationFindings)
      .where(eq(selfOptimizationFindings.id, findingId))
      .limit(1);
    if (!finding) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const [scan] = await db
      .select()
      .from(selfOptimizationScans)
      .where(eq(selfOptimizationScans.id, finding.scanId))
      .limit(1);
    if (!scan || scan.workspaceId !== workspace.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const target = await resolveSelfScanTarget(workspace.id);
    const prompts = generatePrompts(
      {
        category: finding.category,
        title: finding.title,
        problem: finding.problem,
        businessImpact: finding.businessImpact,
        whyItMatters: finding.whyItMatters,
        estimatedOpportunity: finding.estimatedOpportunity,
        confidence: finding.confidence,
        evidence: finding.evidence ?? [],
        fixPath: finding.fixPath ?? "",
        difficulty: finding.difficulty ?? "medium",
        estimatedTime: finding.estimatedTime ?? "",
        verificationSteps: finding.verificationSteps ?? [],
        pageUrl: finding.pageUrl,
      },
      { product: "MoneyGap AI", targetUrl: target.url },
    );

    await db
      .update(selfOptimizationFindings)
      .set({ prompts })
      .where(eq(selfOptimizationFindings.id, finding.id));

    return Response.json({ ok: true, prompts });
  } catch {
    return Response.json({ error: "Could not generate prompts" }, { status: 500 });
  }
}
