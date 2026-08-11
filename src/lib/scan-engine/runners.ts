import type { StageRunnerMap, StageRunnerContext, StageRunnerResult } from "moneygap-scan-engine";
import { STAGE_DEFS } from "moneygap-scan-engine";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses, websitePages } from "@/db/schema";

async function syncAnalysisLabel(
  analysisId: string,
  stageId: string,
  progressHint?: number,
) {
  const def = STAGE_DEFS.find((d) => d.id === stageId);
  await db
    .update(websiteAnalyses)
    .set({
      status: "running",
      stage: def?.label ?? stageId,
      ...(progressHint != null ? { progress: progressHint } : {}),
      scanPhase:
        stageId === "acquire" || stageId === "normalize"
          ? "processing"
          : "analyzing",
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

/**
 * Stage runners that reuse existing pipeline pieces.
 * Runs on the scan worker process (full monorepo / tsx), not inside Vercel after().
 */
export function buildDefaultStageRunners(): StageRunnerMap {
  return {
    async acquire(ctx: StageRunnerContext): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "acquire", 10);
      await ctx.heartbeat();

      // Prefer existing crawl acquisition path (providers unchanged).
      const { startCrawlAcquisition } = await import(
        "@/lib/scan/crawlers/acquisition"
      );
      await startCrawlAcquisition(ctx.analysisId);
      await ctx.heartbeat();

      // Wait until pages exist or deadline — worker also drains crawl_jobs.
      const { processScanTick } = await import("@/lib/scan/batch");
      while (Date.now() < ctx.deadlineAtMs) {
        if (ctx.signal?.aborted) break;
        const pages = await db.query.websitePages.findMany({
          where: eq(websitePages.analysisId, ctx.analysisId),
          columns: { id: true },
          limit: 1,
        });
        if (pages.length > 0) {
          const analysis = await db.query.websiteAnalyses.findFirst({
            where: eq(websiteAnalyses.id, ctx.analysisId),
            columns: { pagesCompleted: true, scanPhase: true },
          });
          // For worker mode, pages may arrive while phase is waiting/analyzing
          if (
            (analysis?.pagesCompleted ?? 0) > 0 ||
            analysis?.scanPhase === "analyzing" ||
            analysis?.scanPhase === "completed"
          ) {
            return {
              status: "completed",
              metadata: { pagesCompleted: analysis?.pagesCompleted ?? pages.length },
            };
          }
        }
        const tick = await processScanTick(ctx.analysisId);
        await ctx.heartbeat();
        if (tick.done) {
          const again = await db.query.websitePages.findMany({
            where: eq(websitePages.analysisId, ctx.analysisId),
            columns: { id: true },
            limit: 5,
          });
          if (again.length === 0) {
            return {
              status: "failed",
              errorClass: "ACQUIRE_EMPTY",
              errorMessage: "Crawl finished with no pages",
            };
          }
          return { status: "completed", metadata: { pages: again.length } };
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      const finalPages = await db.query.websitePages.findMany({
        where: eq(websitePages.analysisId, ctx.analysisId),
        columns: { id: true },
        limit: 1,
      });
      if (finalPages.length > 0) {
        return { status: "partial", metadata: { deadline: true } };
      }
      return {
        status: "failed",
        errorClass: "ACQUIRE_DEADLINE",
        errorMessage: "Acquire stage deadline exceeded",
      };
    },

    async normalize(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "normalize", 22);
      await ctx.heartbeat();
      const { dedupePagesByUrl } = await import("@/lib/analysis/corpus");
      const rows = await db.query.websitePages.findMany({
        where: eq(websitePages.analysisId, ctx.analysisId),
      });
      const pages = dedupePagesByUrl(
        rows.map((p) => ({
          url: p.url,
          pageType: (p.pageType as "other") || "other",
          title: p.title,
          markdown: p.markdown ?? "",
          metadata: (p.metadata as Record<string, unknown>) ?? {},
        })),
      );
      const { buildCompactIntelligenceCorpus } = await import(
        "@/lib/analysis/corpus"
      );
      const packed = buildCompactIntelligenceCorpus(pages);
      return {
        status: pages.length > 0 ? "completed" : "failed",
        metadata: {
          pageCount: packed.pageCount,
          inputChars: packed.inputChars,
          estimatedTokens: packed.estimatedTokens,
        },
        errorClass: pages.length === 0 ? "NORMALIZE_EMPTY" : undefined,
        errorMessage:
          pages.length === 0 ? "No pages to normalize" : undefined,
      };
    },

    async intelligence(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "intelligence", 35);
      await ctx.heartbeat();
      // Full post-crawl through intelligence+persist engines — lease heartbeats keep reclaim away.
      const { runPostCrawlAnalysis } = await import("@/lib/analysis/pipeline");
      await runPostCrawlAnalysis(ctx.analysisId);
      await ctx.heartbeat();
      const analysis = await db.query.websiteAnalyses.findFirst({
        where: eq(websiteAnalyses.id, ctx.analysisId),
        columns: { reportId: true, status: true },
      });
      if (!analysis?.reportId) {
        return {
          status: "failed",
          errorClass: "INTELLIGENCE_NO_REPORT",
          errorMessage: "Intelligence finished without reportId",
        };
      }
      return {
        status: "completed",
        metadata: { reportId: analysis.reportId },
      };
    },

    async moneygap(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "moneygap", 70);
      await ctx.heartbeat();
      // MoneyGap already runs inside runPostCrawlAnalysis; treat as idempotent complete if report has score.
      const analysis = await db.query.websiteAnalyses.findFirst({
        where: eq(websiteAnalyses.id, ctx.analysisId),
        columns: { reportId: true },
      });
      if (!analysis?.reportId) {
        return {
          status: "failed",
          errorClass: "MONEYGAP_NO_REPORT",
          errorMessage: "Missing report for MoneyGap stage",
        };
      }
      const { runMoneyGapEngineOnly } = await import("@/lib/analysis/pipeline");
      try {
        await runMoneyGapEngineOnly(ctx.analysisId);
      } catch {
        /* soft if already done */
      }
      await ctx.heartbeat();
      return { status: "completed" };
    },

    async findings(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "findings", 78);
      // Findings are embedded in MoneyGap module output today.
      return {
        status: "completed",
        metadata: { embedded: true, mode: ctx.mode },
      };
    },

    async roadmap(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "roadmap", 85);
      // Roadmap built inside MoneyGap persist (deterministic).
      return {
        status: "completed",
        metadata: { mode: ctx.mode, source: "moneygap_persist" },
      };
    },

    async competitive(ctx): Promise<StageRunnerResult> {
      if (ctx.mode === "skip") {
        return { status: "skipped" };
      }
      await syncAnalysisLabel(ctx.analysisId, "competitive", 92);
      await ctx.heartbeat();
      try {
        const { runCompetitiveIntelligenceOnly } = await import(
          "@/lib/analysis/pipeline"
        );
        await runCompetitiveIntelligenceOnly(ctx.analysisId);
        return { status: "completed" };
      } catch (err) {
        return {
          status: "partial",
          errorClass: "COMPETITIVE_SOFT_FAIL",
          errorMessage: err instanceof Error ? err.message : String(err),
        };
      }
    },

    async finalize(ctx): Promise<StageRunnerResult> {
      await syncAnalysisLabel(ctx.analysisId, "finalize", 98);
      const analysis = await db.query.websiteAnalyses.findFirst({
        where: eq(websiteAnalyses.id, ctx.analysisId),
        columns: { reportId: true, status: true },
      });
      if (!analysis?.reportId) {
        return {
          status: "failed",
          errorClass: "FINALIZE_NO_REPORT",
          errorMessage: "Cannot finalize without report",
        };
      }
      await db
        .update(websiteAnalyses)
        .set({
          status: "completed",
          scanPhase: "completed",
          stage: "Complete",
          progress: 100,
          completedAt: new Date(),
          error: null,
        })
        .where(eq(websiteAnalyses.id, ctx.analysisId));
      return { status: "completed", metadata: { reportId: analysis.reportId } };
    },
  };
}
