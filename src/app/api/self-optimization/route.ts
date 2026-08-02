import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationFindings,
  selfOptimizationMetadataDrafts,
  selfOptimizationScans,
} from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getScanSummaries,
  isSelfOptimizationEnabled,
  markStaleRunningFailed,
  resolveSelfScanTarget,
  runSelfOptimizationScan,
  upsertSelfOptSettings,
} from "@/lib/self-optimization";

export const maxDuration = 60;

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    await markStaleRunningFailed(workspace.id);
    const enabled = isSelfOptimizationEnabled();
    const target = await resolveSelfScanTarget(workspace.id);
    const summaries = await getScanSummaries(workspace.id);

    const latestFindings = summaries.latest
      ? await db
          .select()
          .from(selfOptimizationFindings)
          .where(eq(selfOptimizationFindings.scanId, summaries.latest.id))
          .orderBy(desc(selfOptimizationFindings.estimatedOpportunity))
          .limit(25)
      : [];

    const drafts = await db
      .select()
      .from(selfOptimizationMetadataDrafts)
      .where(eq(selfOptimizationMetadataDrafts.workspaceId, workspace.id))
      .orderBy(desc(selfOptimizationMetadataDrafts.createdAt))
      .limit(10);

    const scores = summaries.latest?.scores ?? null;

    return Response.json({
      enabled: enabled && target.enabled,
      message: !enabled
        ? "Self Optimization™ is disabled (FEATURE_SELF_OPTIMIZATION)."
        : target.message,
      targetUrl: target.url,
      targetSource: target.source,
      scores: scores
        ? {
            overall: scores.overall,
            seo: scores.seo,
            trust: scores.trust,
            conversion: scores.conversion,
            performance: scores.performance,
            aiVisibility: scores.aiVisibility,
            contentCoverage: scores.contentCoverage,
            backlinkHealth: scores.backlinkHealth,
            crawlability: scores.crawlability,
            crawlabilityStatus: scores.crawlabilityStatus,
            crawlabilityContributors: scores.crawlabilityContributors,
            crawlabilitySummary: scores.crawlabilitySummary,
            crawlabilityEstimatedImprovement:
              scores.crawlabilityEstimatedImprovement,
            unavailableReasons: scores.unavailableReasons ?? {},
            estimatedOpportunity: scores.estimatedOpportunity,
            labeled: "AI Estimate",
          }
        : null,
      latestScan: (summaries.latestAny ?? summaries.latest)
        ? {
            id: (summaries.latestAny ?? summaries.latest)!.id,
            status: (summaries.latestAny ?? summaries.latest)!.status,
            summary: (summaries.latestAny ?? summaries.latest)!.summary,
            error: (summaries.latestAny ?? summaries.latest)!.error,
            targetUrl: (summaries.latestAny ?? summaries.latest)!.targetUrl,
            reportId: (summaries.latestAny ?? summaries.latest)!.reportId,
            websiteId: (summaries.latestAny ?? summaries.latest)!.websiteId,
            finishedAt:
              (summaries.latestAny ?? summaries.latest)!.finishedAt?.toISOString() ??
              null,
            createdAt: (
              summaries.latestAny ?? summaries.latest
            )!.createdAt.toISOString(),
          }
        : null,
      trend: summaries.trend,
      deltas: summaries.deltas,
      crawlability: summaries.crawlability,
      findings: latestFindings.map((f) => ({
        id: f.id,
        category: f.category,
        title: f.title,
        problem: f.problem,
        businessImpact: f.businessImpact,
        whyItMatters: f.whyItMatters,
        estimatedOpportunity: f.estimatedOpportunity,
        estimateLabeled: f.estimateLabeled,
        confidence: f.confidence,
        evidence: f.evidence,
        fixPath: f.fixPath,
        difficulty: f.difficulty,
        estimatedTime: f.estimatedTime,
        priority: f.priority,
        verificationSteps: f.verificationSteps,
        prompts: f.prompts,
        pageUrl: f.pageUrl,
        opportunityId: f.opportunityId,
        reportId: summaries.latest?.reportId ?? null,
      })),
      drafts: drafts.map((d) => ({
        id: d.id,
        pageUrl: d.pageUrl,
        status: d.status,
        proposedTitle: d.proposedTitle,
        proposedDescription: d.proposedDescription,
        snippet: d.snippet,
        currentTitle: d.currentTitle,
        currentDescription: d.currentDescription,
      })),
      stats: {
        dailyCount: summaries.dailyCount,
        weeklyCount: summaries.weeklyCount,
        monthlyCount: summaries.monthlyCount,
        resolvedHint: summaries.resolvedHint,
      },
    });
  } catch (err) {
    console.error("self-optimization GET", err);
    return Response.json(
      { error: "Could not load Self Optimization™" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    let body: { action?: string; targetUrl?: string; enabled?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }

    if (body.action === "settings") {
      const row = await upsertSelfOptSettings(workspace.id, {
        targetUrl: body.targetUrl,
        enabled: body.enabled,
      });
      return Response.json({ ok: true, settings: row });
    }

    if (!isSelfOptimizationEnabled()) {
      return Response.json(
        {
          ok: false,
          message: "Self Optimization™ is disabled.",
        },
        { status: 200 },
      );
    }

    // Run after the response so local self-scans can fetch this same server
    // without deadlocking the in-flight POST.
    after(() => {
      void runSelfOptimizationScan({
        workspaceId: workspace.id,
        trigger: "manual",
      }).catch((e) => console.error("self-opt scan", e));
    });

    return Response.json({
      ok: true,
      started: true,
      message: "Self scan started. Scores will appear when probes finish.",
    });
  } catch (err) {
    console.error("self-optimization POST", err);
    return Response.json({ error: "Scan failed", detail: String(err) }, { status: 500 });
  }
}
