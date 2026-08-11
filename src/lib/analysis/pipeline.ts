import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  audienceProfiles,
  businessProfiles,
  contentAnalyses,
  moneyGapOpportunities,
  reports,
  websiteAnalyses,
  websiteInsights,
  websitePages,
  websites,
} from "@/db/schema";
import { buildCrawlCorpus, type ScrapedPage } from "@/lib/analysis/firecrawl";
import {
  AnalysisPipelineError,
  classifyAiError,
  classifyDbError,
} from "@/lib/analysis/ai-errors";
import {
  buildCompactIntelligenceCorpus,
  buildSiteIntelligenceModel,
  dedupePagesByUrl,
} from "@/lib/analysis/corpus";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import { generateWebsiteIntelligence } from "@/lib/analysis/openai";
import { persistMoneyGapEngineResult } from "@/lib/analysis/persist-money-gaps";
import { persistCompetitiveIntelligence } from "@/lib/analysis/competitive/persist";
import {
  claimPostCrawlAnalysis,
  releasePostCrawlClaim,
  touchPostCrawlProgress,
} from "@/lib/analysis/post-crawl-guard";
import { isMoneyGapClaimFresh } from "@/lib/analysis/roadmap-errors";
import {
  ANALYSIS_STAGES,
  MISSING_KEYS_ERROR,
  PUBLIC_CRAWL_ERROR,
  type AnalysisStageId,
} from "@/lib/analysis/stages";
import { log } from "@/lib/observability/logger";
import { trackProductMetric } from "@/lib/observability/metrics";
import { isScanProfile } from "@/lib/scan/profiles";
import type { ScanProfile } from "@/lib/scan/types";
import { MONEYGAP_ENGINE_VERSION, TRUST_ENGINE_VERSION } from "@/lib/trust";

async function setStage(analysisId: string, stageId: AnalysisStageId | "complete") {
  const current = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { status: true, scanMeta: true },
  });
  // Do not revive a user-stopped or failed analysis.
  if (current?.status === "failed" || current?.status === "completed") {
    return;
  }

  const stage =
    stageId === "complete"
      ? { id: "complete", label: "Complete", progress: 100 }
      : ANALYSIS_STAGES.find((s) => s.id === stageId)!;

  const now = Date.now();
  const meta = {
    ...((current?.scanMeta as Record<string, unknown>) ?? {}),
    lastProgressAt: now,
    postCrawlLastProgressAt: now,
  };

  await db
    .update(websiteAnalyses)
    .set({
      status: stageId === "complete" ? "completed" : "running",
      stage: stage.label,
      progress: stage.progress,
      scanMeta: meta,
      ...(stageId === "complete" ? { completedAt: new Date(), error: null } : {}),
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

/** Heartbeat label during long Money Gap work — keeps poll UI honest without new stage ids. */
export async function updateAnalysisStageLabel(
  analysisId: string,
  label: string,
  progress?: number,
) {
  const current = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { status: true },
  });
  if (current?.status === "failed" || current?.status === "completed") {
    return;
  }

  await db
    .update(websiteAnalyses)
    .set({
      status: "running",
      stage: label,
      ...(progress != null ? { progress } : {}),
    })
    .where(eq(websiteAnalyses.id, analysisId));
}

async function failAnalysis(
  analysisId: string,
  websiteId: string,
  message: string,
  diagnostics?: Record<string, unknown>,
) {
  const row = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: { startedAt: true, scanMeta: true },
  });
  const durationMs = row?.startedAt
    ? Date.now() - row.startedAt.getTime()
    : null;

  await db
    .update(websiteAnalyses)
    .set({
      status: "failed",
      stage: "Failed",
      error: message,
      completedAt: new Date(),
      ...(durationMs != null ? { durationMs } : {}),
      ...(diagnostics
        ? {
            scanMeta: {
              ...((row?.scanMeta as Record<string, unknown>) ?? {}),
              ...diagnostics,
            },
          }
        : {}),
    })
    .where(eq(websiteAnalyses.id, analysisId));

  await db
    .update(websites)
    .set({ status: "error", updatedAt: new Date() })
    .where(eq(websites.id, websiteId));
}

export const ANALYSIS_CANCELLED_ERROR =
  "Scan stopped. You can retry this site or enter a different URL.";

/** User-initiated stop — marks failed so the UI unlocks (pipeline setStage will no-op). */
export async function cancelRunningAnalysis(input: {
  analysisId: string;
  userId: string;
}) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, input.analysisId),
    columns: {
      id: true,
      userId: true,
      websiteId: true,
      status: true,
    },
  });
  if (!analysis || analysis.userId !== input.userId) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (analysis.status === "completed") {
    return { ok: false as const, reason: "already_complete" as const };
  }
  if (analysis.status === "failed") {
    return { ok: true as const, reason: "already_failed" as const };
  }

  await failAnalysis(
    analysis.id,
    analysis.websiteId,
    ANALYSIS_CANCELLED_ERROR,
  );
  log("info", "analysis_cancelled_by_user", { analysisId: analysis.id });
  return { ok: true as const, reason: "cancelled" as const };
}

/** Fail a stale run that never produced a report (hung crawl / killed serverless). */
export async function failStalePreReportAnalysis(analysisId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: {
      id: true,
      status: true,
      reportId: true,
      startedAt: true,
      createdAt: true,
      websiteId: true,
      stage: true,
      scanPhase: true,
      scanProfile: true,
      pagesCompleted: true,
      estimatedRemainingMs: true,
    },
  });
  if (!analysis) return { ok: false as const, reason: "missing" as const };
  if (analysis.reportId) return { ok: false as const, reason: "has_report" as const };
  if (analysis.status !== "running" && analysis.status !== "queued") {
    return { ok: false as const, reason: "not_running" as const };
  }
  if (analysis.scanPhase === "paused") {
    return { ok: false as const, reason: "paused" as const };
  }

  const clock = analysis.startedAt ?? analysis.createdAt;
  const ageMs = Date.now() - clock.getTime();

  // All product profiles use incremental ticks and can outlive one serverless window.
  const incremental =
    analysis.scanPhase === "discovering" ||
    analysis.scanPhase === "processing" ||
    analysis.scanPhase === "waiting" ||
    analysis.scanPhase === "analyzing";
  const HARD_CEILING_MS = 3 * 60 * 60 * 1000;
  const softFloorMs = Math.max(
    PRE_REPORT_STALE_MS,
    (analysis.estimatedRemainingMs ?? 0) + 15 * 60 * 1000,
    30 * 60 * 1000 + (analysis.pagesCompleted ?? 0) * 2_000,
  );
  // True ceiling — ETA cannot push unlock past HARD_CEILING_MS.
  const budgetMs = incremental
    ? Math.min(HARD_CEILING_MS, softFloorMs)
    : PRE_REPORT_STALE_MS;

  if (ageMs < budgetMs) {
    return { ok: false as const, reason: "too_fresh" as const };
  }

  log("warn", "analysis_fail_stale_pre_report", {
    analysisId,
    stage: analysis.stage,
    status: analysis.status,
    scanPhase: analysis.scanPhase,
    budgetMs,
  });

  await failAnalysis(
    analysisId,
    analysis.websiteId,
    "Reading pages timed out (crawl took too long or the worker was interrupted). Please try analyzing again.",
  );
  return { ok: true as const, reason: "failed_stale" as const };
}

function toUserSafeError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message === PUBLIC_CRAWL_ERROR ||
      err.message === MISSING_KEYS_ERROR ||
      err.message.includes("Intelligence generation failed")
    ) {
      return err.message;
    }
  }
  return "Analysis failed unexpectedly. Please try again in a moment.";
}

function developerDiagnostics(
  err: unknown,
  patch: Record<string, unknown> = {},
): Record<string, unknown> {
  const errorClass =
    err instanceof AnalysisPipelineError
      ? err.errorClass
      : classifyAiError(err);
  return {
    failedStage: patch.failedStage ?? "preparing",
    errorClass,
    errorMessage: err instanceof Error ? err.message : String(err),
    causeMessage:
      err instanceof AnalysisPipelineError ? err.causeMessage ?? null : null,
    severity: "FATAL",
    ...patch,
  };
}

function reconstructIntelligence(input: {
  overview: string | null;
  business: typeof businessProfiles.$inferSelect | null;
  audience: typeof audienceProfiles.$inferSelect | null;
  content: typeof contentAnalyses.$inferSelect | null;
  insights: (typeof websiteInsights.$inferSelect)[];
  intelligenceScore: number | null;
  scoreBreakdown: {
    businessClarity: number;
    audienceClarity: number;
    monetizationVisibility: number;
    contentAuthority: number;
    trustSignals: number;
  } | null;
}): IntelligenceResult {
  const monetizationPresent = input.insights
    .filter((i) => i.category === "monetization" && i.present === true)
    .map((i) => i.title);
  const monetizationMissing = input.insights
    .filter((i) => i.category === "monetization" && i.present === false)
    .map((i) => i.title);

  const productsByKey = (key: string) =>
    input.insights.filter((i) => i.category === "product" && i.key === key).map((i) => i.title);

  const trustFlag = (key: string) =>
    input.insights.find((i) => i.category === "trust" && i.key === key)?.present ?? false;

  return {
    overview: input.overview ?? "",
    business: {
      industry: input.business?.industry ?? "",
      businessType: input.business?.businessType ?? "",
      companyType: input.business?.companyType ?? "",
      businessModel: input.business?.businessModel ?? "",
      revenueModel: input.business?.revenueModel ?? "",
      targetCustomer: input.business?.targetCustomer ?? "",
      targetMarket: input.business?.targetMarket ?? "",
      productsServices: input.business?.productsServices ?? [],
    },
    audience: {
      primaryAudience: input.audience?.primaryAudience ?? "",
      secondaryAudience: input.audience?.secondaryAudience ?? "",
      customerProblems: input.audience?.customerProblems ?? [],
      customerGoals: input.audience?.customerGoals ?? [],
      buyingIntent: input.audience?.buyingIntent ?? "",
    },
    products: {
      products: productsByKey("products"),
      services: productsByKey("services"),
      freeResources: productsByKey("free_resources"),
      digitalProducts: productsByKey("digital_products"),
      subscriptions: productsByKey("subscriptions"),
      courses: productsByKey("courses"),
      consulting: productsByKey("consulting"),
      community: productsByKey("community"),
    },
    monetization: {
      present: monetizationPresent,
      missing: monetizationMissing,
    },
    content: {
      blogPresence: input.content?.blogPresence ?? false,
      contentCategories: input.content?.contentCategories ?? [],
      contentFrequency: input.content?.contentFrequency ?? "",
      educationalResources: input.content?.educationalResources ?? [],
      seoOpportunities: input.content?.seoOpportunities ?? [],
      contentStrengths: input.content?.contentStrengths ?? [],
      contentStrategy: input.content?.contentStrategy ?? "",
    },
    trust: {
      testimonials: Boolean(trustFlag("testimonials")),
      reviews: Boolean(trustFlag("reviews")),
      caseStudies: Boolean(trustFlag("case_studies")),
      socialProof: Boolean(trustFlag("social_proof")),
      credentials: Boolean(trustFlag("credentials")),
      customerLogos: Boolean(trustFlag("customer_logos")),
      details: input.insights
        .filter((i) => i.category === "trust" && i.key === "detail")
        .map((i) => i.title),
    },
    score: {
      overall: input.intelligenceScore ?? 0,
      businessClarity: input.scoreBreakdown?.businessClarity ?? 0,
      audienceClarity: input.scoreBreakdown?.audienceClarity ?? 0,
      monetizationVisibility: input.scoreBreakdown?.monetizationVisibility ?? 0,
      contentAuthority: input.scoreBreakdown?.contentAuthority ?? 0,
      trustSignals: input.scoreBreakdown?.trustSignals ?? 0,
    },
  };
}

export async function runMoneyGapEngineOnly(analysisId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    with: {
      website: true,
      report: {
        with: {
          businessProfile: true,
          audienceProfile: true,
          contentAnalysis: true,
          insights: true,
        },
      },
      pages: true,
    },
  });

  if (!analysis?.reportId || !analysis.report) {
    throw new Error("Analysis report not found.");
  }

  const corpus =
    analysis.pages.length > 0
      ? buildCrawlCorpus(
          analysis.pages.map((p) => ({
            url: p.url,
            pageType: p.pageType as
              | "homepage"
              | "nav"
              | "about"
              | "services"
              | "products"
              | "pricing"
              | "blog"
              | "contact"
              | "faq"
              | "resources"
              | "other",
            title: p.title,
            markdown: p.markdown ?? "",
            metadata: (p.metadata as Record<string, unknown>) ?? {},
          })),
        )
      : analysis.report.overview ?? "";

  const intelligence = reconstructIntelligence({
    overview: analysis.report.overview,
    business: analysis.report.businessProfile,
    audience: analysis.report.audienceProfile,
    content: analysis.report.contentAnalysis,
    insights: analysis.report.insights,
    intelligenceScore: analysis.report.intelligenceScore,
    scoreBreakdown: analysis.report.scoreBreakdown ?? null,
  });

  // Stay on category scoring when resuming — persistMoneyGapEngineResult owns stage labels.
  await setStage(analysisId, "detecting_gaps");

  const result = await persistMoneyGapEngineResult({
    analysisId,
    reportId: analysis.reportId,
    url: analysis.url,
    domain: analysis.website.domain,
    intelligence,
    corpus,
  });

  if (result.ok) {
    try {
      const { runMonitorPostProcess } = await import("@/lib/monitor/post-process");
      await runMonitorPostProcess({
        websiteId: analysis.websiteId,
        reportId: analysis.reportId,
        workspaceId: analysis.workspaceId,
        analysisId,
      });
    } catch (err) {
      console.error("Monitor post-process soft-fail:", err);
    }
  }

  await setStage(analysisId, "complete");
  return result;
}

const STALE_RUNNING_MS = 8 * 60 * 1000;
/** Pre-report crawl (Reading pages) should fail sooner than full engine stale. */
const PRE_REPORT_STALE_MS = 25 * 60 * 1000;
/** Terminal fail if still not done this long after analysis creation (resume loops). */
const RESUME_WALL_CLOCK_MS = 25 * 60 * 1000;

/**
 * Resume an analysis that died after the intelligence report was saved
 * (common when Vercel `after()` hits a duration limit mid Money Gap Engine).
 */
export async function resumeStuckAnalysis(analysisId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    columns: {
      id: true,
      status: true,
      reportId: true,
      startedAt: true,
      createdAt: true,
      websiteId: true,
      scanMeta: true,
    },
  });

  if (!analysis?.reportId) {
    return { ok: false as const, reason: "no_report" as const };
  }
  if (analysis.status === "completed") {
    return { ok: true as const, reason: "already_complete" as const };
  }
  if (analysis.status === "failed") {
    return { ok: false as const, reason: "already_failed" as const };
  }

  const wallAge = Date.now() - analysis.createdAt.getTime();
  if (wallAge >= RESUME_WALL_CLOCK_MS) {
    log("warn", "analysis_resume_wall_clock_fail", {
      analysisId,
      wallAgeMs: wallAge,
    });
    await failAnalysis(
      analysisId,
      analysis.websiteId,
      "Analysis timed out while building the Growth Roadmap. Retry the scan — your business intelligence draft may already be saved.",
    );
    return { ok: false as const, reason: "wall_clock" as const };
  }

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, analysis.reportId),
    columns: {
      moneyGapEngineStatus: true,
      competitiveEngineStatus: true,
    },
  });

  const moneyGapDone = report?.moneyGapEngineStatus === "completed";
  const competitiveDone = report?.competitiveEngineStatus === "completed";

  if (moneyGapDone && competitiveDone) {
    log("info", "analysis_resume_engines_already_done", { analysisId });
    await setStage(analysisId, "complete");
    await db
      .update(websites)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(websites.id, analysis.websiteId));
    return { ok: true as const, reason: "already_engines_done" as const };
  }

  // Do not stack a second Money Gap engine while a claimed run is still progressing.
  if (!moneyGapDone) {
    const meta = (analysis.scanMeta as Record<string, unknown>) ?? {};
    const claimedAt =
      typeof meta.moneyGapClaimedAt === "number" ? meta.moneyGapClaimedAt : null;
    const lastProgressAt =
      typeof meta.moneyGapLastProgressAt === "number"
        ? meta.moneyGapLastProgressAt
        : typeof meta.lastProgressAt === "number"
          ? meta.lastProgressAt
          : null;
    if (isMoneyGapClaimFresh({ claimedAt, lastProgressAt })) {
      log("info", "analysis_resume_engine_in_flight", {
        analysisId,
        claimedAt,
        lastProgressAt,
        ageMs:
          lastProgressAt != null ? Date.now() - lastProgressAt : null,
      });
      return { ok: false as const, reason: "engine_in_flight" as const };
    }
  }

  log("info", "analysis_resume_stuck", {
    analysisId,
    status: analysis.status,
    reportId: analysis.reportId,
    moneyGapDone,
    competitiveDone,
  });

  try {
    if (!moneyGapDone) {
      // Lease only when re-entering Money Gap Engine (heavy work).
      await db
        .update(websiteAnalyses)
        .set({
          status: "running",
          stage: "Scoring MoneyGap Categories™…",
          progress: 76,
          startedAt: new Date(),
          error: null,
        })
        .where(eq(websiteAnalyses.id, analysisId));

      const moneyGap = await runMoneyGapEngineOnly(analysisId);
      if (!moneyGap.ok) {
        log("warn", "analysis_resume_money_gap_soft_fail", {
          analysisId,
          error: moneyGap.error,
        });
      }
    } else {
      // Money Gap finished — skip engine; take a short lease for competitive only.
      await db
        .update(websiteAnalyses)
        .set({
          status: "running",
          stage: "Discovering competitors…",
          progress: 91,
          startedAt: new Date(),
          error: null,
        })
        .where(eq(websiteAnalyses.id, analysisId));
    }

    if (!competitiveDone) {
      try {
        await runCompetitiveIntelligenceOnly(analysisId);
      } catch (err) {
        log("warn", "analysis_resume_competitive_soft_fail", {
          analysisId,
          error: err instanceof Error ? err.message : String(err),
        });
        await setStage(analysisId, "complete");
      }
    } else if (moneyGapDone) {
      await setStage(analysisId, "complete");
    }

    await db
      .update(websites)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(websites.id, analysis.websiteId));

    return { ok: true as const, reason: "resumed" as const };
  } catch (err) {
    log("error", "analysis_resume_failed", {
      analysisId,
      error: err instanceof Error ? err.message : String(err),
    });
    await failAnalysis(
      analysisId,
      analysis.websiteId,
      "Analysis timed out while building the Growth Roadmap. Retry the scan — your business intelligence draft may already be saved.",
    );
    return { ok: false as const, reason: "failed" as const };
  }
}

/** True when a running analysis looks abandoned (serverless kill / hung crawl / OpenAI). */
export function isStaleRunningAnalysis(input: {
  status: string;
  startedAt: Date | null;
  reportId: string | null;
}): boolean {
  if ((input.status !== "running" && input.status !== "queued") || !input.startedAt) {
    return false;
  }
  return Date.now() - input.startedAt.getTime() >= STALE_RUNNING_MS;
}

export async function runCompetitiveIntelligenceOnly(analysisId: string) {
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    with: {
      website: true,
      report: {
        with: {
          businessProfile: true,
          audienceProfile: true,
          contentAnalysis: true,
          insights: true,
        },
      },
      pages: true,
    },
  });

  if (!analysis?.reportId || !analysis.report) {
    throw new Error("Analysis report not found.");
  }

  const corpus =
    analysis.pages.length > 0
      ? buildCrawlCorpus(
          analysis.pages.map((p) => ({
            url: p.url,
            pageType: p.pageType as
              | "homepage"
              | "nav"
              | "about"
              | "services"
              | "products"
              | "pricing"
              | "blog"
              | "contact"
              | "faq"
              | "resources"
              | "other",
            title: p.title,
            markdown: p.markdown ?? "",
            metadata: (p.metadata as Record<string, unknown>) ?? {},
          })),
        )
      : analysis.report.overview ?? "";

  const intelligence = reconstructIntelligence({
    overview: analysis.report.overview,
    business: analysis.report.businessProfile,
    audience: analysis.report.audienceProfile,
    content: analysis.report.contentAnalysis,
    insights: analysis.report.insights,
    intelligenceScore: analysis.report.intelligenceScore,
    scoreBreakdown: analysis.report.scoreBreakdown ?? null,
  });

  await db
    .update(reports)
    .set({
      competitiveEngineStatus: "pending",
      competitiveEngineError: null,
    })
    .where(eq(reports.id, analysis.reportId));

  const profileForCompetitive: ScanProfile = isScanProfile(analysis.scanProfile)
    ? analysis.scanProfile
    : "standard";
  if (profileForCompetitive === "quick") {
    await db
      .update(reports)
      .set({
        competitiveEngineStatus: "skipped",
        competitiveEngineError: null,
      })
      .where(eq(reports.id, analysis.reportId));
    await setStage(analysisId, "complete");
    return { ok: true as const };
  }

  await setStage(analysisId, "discovering_competitors");

  const result = await persistCompetitiveIntelligence({
    analysisId,
    reportId: analysis.reportId,
    websiteId: analysis.websiteId,
    ctx: {
      url: analysis.url,
      domain: analysis.website.domain,
      siteName: analysis.website.name,
      intelligence,
      userCorpus: corpus,
    },
    hooks: {
      onDiscoverDone: () => setStage(analysisId, "profiling_competitors"),
      onProfileStart: () => setStage(analysisId, "profiling_competitors"),
      onAnalyzeStart: () => setStage(analysisId, "competitive_analysis"),
    },
  });

  if (result.ok) {
    try {
      const { writeCompetitorSnapshots } = await import(
        "@/lib/monitor/competitor-snapshot"
      );
      await writeCompetitorSnapshots({
        websiteId: analysis.websiteId,
        reportId: analysis.reportId,
      });
    } catch (err) {
      console.error("competitorSnapshots soft-fail:", err);
    }
  }

  await setStage(analysisId, "complete");
  return result;
}

export async function runAnalysisPipeline(analysisId: string) {
  const startedAtMs = Date.now();
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    with: { website: true },
  });

  if (!analysis) return;

  if (!process.env.OPENAI_API_KEY) {
    await failAnalysis(analysisId, analysis.websiteId, MISSING_KEYS_ERROR);
    return;
  }

  try {
    log("info", "analysis_started", {
      analysisId,
      workspaceId: analysis.workspaceId,
      websiteId: analysis.websiteId,
    });

    await db
      .update(websiteAnalyses)
      .set({
        status: "running",
        startedAt: new Date(),
        error: null,
      })
      .where(eq(websiteAnalyses.id, analysisId));

    await db
      .update(websites)
      .set({ status: "analyzing", updatedAt: new Date() })
      .where(eq(websites.id, analysis.websiteId));

    await setStage(analysisId, "connecting");
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          scanStage: "connect",
          stageDiagnostics: [{ stage: "connect", status: "ok" }],
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));

    const profileId: ScanProfile = isScanProfile(analysis.scanProfile)
      ? analysis.scanProfile
      : "standard";

    // Acquisition: Apify (async) → Firecrawl → MoneyGap native discover/ticks.
    await db
      .update(websiteAnalyses)
      .set({
        scanProfile: profileId,
        scanPhase: "discovering",
        status: "running",
      })
      .where(eq(websiteAnalyses.id, analysisId));
    const { startCrawlAcquisition } = await import("@/lib/scan/crawlers");
    await startCrawlAcquisition(analysisId);
    return;
  } catch (err) {
    log("error", "analysis_failed", {
      analysisId,
      durationMs: Date.now() - startedAtMs,
      error: err instanceof Error ? err.message : String(err),
    });
    await failAnalysis(analysisId, analysis.websiteId, toUserSafeError(err));
  }
}

/** Resume analysis after durable crawl pages are stored in website_pages. */
export async function runPostCrawlAnalysis(analysisId: string) {
  const startedAtMs = Date.now();
  const claim = await claimPostCrawlAnalysis(analysisId);
  if (!claim.claimed) {
    log("info", "post_crawl_skipped", {
      analysisId,
      reason: claim.reason,
      reportId: claim.reportId,
    });
    // If a report already exists but engines pending, resume instead of no-op fail.
    if (claim.reason === "report_exists" && claim.reportId) {
      try {
        await resumeStuckAnalysis(analysisId);
      } catch (err) {
        log("warn", "post_crawl_resume_soft_fail", {
          analysisId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    // already_claimed / lost_race: fresh lease owns work; stale leases are stolen above.
    return;
  }

  const analysis = await db.query.websiteAnalyses.findFirst({
    where: eq(websiteAnalyses.id, analysisId),
    with: { website: true },
  });
  if (!analysis) {
    await releasePostCrawlClaim(analysisId, { postCrawlSkip: "missing" });
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    await releasePostCrawlClaim(analysisId, {
      errorClass: "AI_PROVIDER_ERROR",
    });
    await failAnalysis(analysisId, analysis.websiteId, MISSING_KEYS_ERROR, {
      failedStage: "preparing",
      errorClass: "AI_PROVIDER_ERROR",
      severity: "FATAL",
    });
    return;
  }

  const rows = await db.query.websitePages.findMany({
    where: eq(websitePages.analysisId, analysisId),
  });
  const rawPages: ScrapedPage[] = rows.map((p) => ({
    url: p.url,
    pageType: (p.pageType as ScrapedPage["pageType"]) || "other",
    title: p.title,
    markdown: p.markdown ?? "",
    metadata: (p.metadata as Record<string, unknown>) ?? {},
  }));
  const pages = dedupePagesByUrl(rawPages);

  if (pages.length === 0) {
    await releasePostCrawlClaim(analysisId, {
      errorClass: "NO_PAGES",
    });
    await failAnalysis(analysisId, analysis.websiteId, PUBLIC_CRAWL_ERROR, {
      failedStage: "extract_content",
      errorClass: "UNKNOWN",
      severity: "FATAL",
    });
    return;
  }

  log("info", "REPORT_GENERATION_START", {
    analysisId,
    rawPageRows: rawPages.length,
    distinctPages: pages.length,
    durationMs: Date.now() - startedAtMs,
  });

  // Heartbeat while intelligence LLM runs so the lease stays fresh.
  const heartbeat = setInterval(() => {
    void touchPostCrawlProgress(analysisId, {
      postCrawlStage: "intelligence_llm",
    });
  }, 20_000);

  try {
    await touchPostCrawlProgress(analysisId, {
      postCrawlStage: "start",
    });
    await finishPipelineWithPages(analysisId, analysis, pages, startedAtMs, {
      rawPageRows: rawPages.length,
    });
  } catch (err) {
    const errorClass =
      err instanceof AnalysisPipelineError
        ? err.errorClass
        : classifyDbError(err);
    log("error", "analysis_failed", {
      analysisId,
      durationMs: Date.now() - startedAtMs,
      errorClass,
      error: err instanceof Error ? err.message : String(err),
    });
    // If intelligence report already persisted, do not wipe it — mark partial + resume path.
    const latest = await db.query.websiteAnalyses.findFirst({
      where: eq(websiteAnalyses.id, analysisId),
      columns: { reportId: true },
    });
    if (latest?.reportId) {
      log("warn", "post_crawl_partial_after_error", {
        analysisId,
        reportId: latest.reportId,
        errorClass,
      });
      await db
        .update(websiteAnalyses)
        .set({
          status: "running",
          error: null,
          scanMeta: {
            ...(((
              await db.query.websiteAnalyses.findFirst({
                where: eq(websiteAnalyses.id, analysisId),
                columns: { scanMeta: true },
              })
            )?.scanMeta as Record<string, unknown>) ?? {}),
            partial: true,
            severity: "WARNING",
            failedStage: "money_gap_or_competitive",
            errorClass,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        })
        .where(eq(websiteAnalyses.id, analysisId));
      try {
        await resumeStuckAnalysis(analysisId);
        return;
      } catch {
        /* fall through to fail */
      }
    }
    // Release lease so status-poll can reclaim / reschedule complete.
    await releasePostCrawlClaim(analysisId, {
      errorClass,
      severity: "FATAL",
      errorMessage: err instanceof Error ? err.message : String(err),
      failedStage: "preparing",
    });
    await failAnalysis(
      analysisId,
      analysis.websiteId,
      toUserSafeError(err),
      developerDiagnostics(err, {
        failedStage: "preparing",
        durationMs: Date.now() - startedAtMs,
      }),
    );
  } finally {
    clearInterval(heartbeat);
  }
}

type PipelineAnalysis = NonNullable<
  Awaited<ReturnType<typeof db.query.websiteAnalyses.findFirst>>
> & { website: { domain: string; name: string; id: string } };

async function finishPipelineWithPages(
  analysisId: string,
  analysis: PipelineAnalysis,
  pages: ScrapedPage[],
  startedAtMs: number,
  opts: { rawPageRows?: number } = {},
) {
  try {
    const priorMeta =
      (analysis.scanMeta as Record<string, unknown> | null) ?? {};
    const priorDiag = Array.isArray(priorMeta.stageDiagnostics)
      ? (priorMeta.stageDiagnostics as unknown[])
      : [];
    await db
      .update(websiteAnalyses)
      .set({
        scanMeta: {
          ...priorMeta,
          scanStage: "extract_content",
          tickScheduleError: null,
          tickScheduleSeverity: priorMeta.tickScheduleError
            ? "RECOVERED"
            : priorMeta.tickScheduleSeverity ?? null,
          stageDiagnostics: [
            ...priorDiag,
            {
              stage: "extract_content",
              status: "ok",
              detail: `Corpus from ${pages.length} distinct pages${
                opts.rawPageRows && opts.rawPageRows !== pages.length
                  ? ` (deduped from ${opts.rawPageRows} rows)`
                  : ""
              }`,
            },
          ],
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));

    const packed = buildCompactIntelligenceCorpus(pages);
    const siteModel = buildSiteIntelligenceModel(pages);
    const corpus = packed.corpus;

    log("info", "llm_input_budget", {
      analysisId,
      stage: "website_intelligence",
      pageCount: packed.pageCount,
      inputChars: packed.inputChars,
      estimatedTokens: packed.estimatedTokens,
      truncated: packed.truncated,
      droppedPages: packed.droppedPages,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    });

    await setStage(analysisId, "understanding");
    const intelligence = await generateWebsiteIntelligence({
      url: analysis.url,
      domain: analysis.website.domain,
      corpus,
      siteModel,
      pageCount: packed.pageCount,
      stage: "website_intelligence",
    });

    await setStage(analysisId, "extracting");
    await setStage(analysisId, "audience");
    await setStage(analysisId, "content");
    await setStage(analysisId, "preparing");

    log("info", "REPORT_PERSIST_START", { analysisId });

    const siteName =
      pages.find((p) => p.pageType === "homepage")?.title?.split(/[|\-–—]/)[0]?.trim() ||
      analysis.website.name;

    let report: typeof reports.$inferSelect;
    try {
      const inserted = await db
        .insert(reports)
        .values({
          websiteId: analysis.websiteId,
          workspaceId: analysis.workspaceId,
          title: `${siteName} — Growth Intelligence`,
          type: "intelligence",
          status: "ready",
          overview: intelligence.overview,
          summary: intelligence.overview,
          intelligenceScore: intelligence.score.overall,
          scoreBreakdown: {
            businessClarity: intelligence.score.businessClarity,
            audienceClarity: intelligence.score.audienceClarity,
            monetizationVisibility: intelligence.score.monetizationVisibility,
            contentAuthority: intelligence.score.contentAuthority,
            trustSignals: intelligence.score.trustSignals,
          },
          moneyGapScore: 0,
          revenueAtRisk: 0,
          capturePotential: 0,
          moneyGapEngineStatus: "pending",
          competitiveEngineStatus: "pending",
        })
        .returning();
      report = inserted[0]!;
    } catch (err) {
      throw new AnalysisPipelineError(toUserSafeError(err), {
        errorClass: classifyDbError(err),
        cause: err,
      });
    }

    log("info", "REPORT_PERSIST_COMPLETE", {
      analysisId,
      reportId: report.id,
    });

    try {
      await db.insert(businessProfiles).values({
        analysisId,
        reportId: report.id,
        industry: intelligence.business.industry,
        businessType: intelligence.business.businessType,
        companyType: intelligence.business.companyType,
        businessModel: intelligence.business.businessModel,
        revenueModel: intelligence.business.revenueModel,
        targetCustomer: intelligence.business.targetCustomer,
        targetMarket: intelligence.business.targetMarket,
        productsServices: intelligence.business.productsServices,
      });

      await db.insert(audienceProfiles).values({
        analysisId,
        reportId: report.id,
        primaryAudience: intelligence.audience.primaryAudience,
        secondaryAudience: intelligence.audience.secondaryAudience,
        customerProblems: intelligence.audience.customerProblems,
        customerGoals: intelligence.audience.customerGoals,
        buyingIntent: intelligence.audience.buyingIntent,
      });

      await db.insert(contentAnalyses).values({
        analysisId,
        reportId: report.id,
        blogPresence: intelligence.content.blogPresence,
        contentCategories: intelligence.content.contentCategories,
        contentFrequency: intelligence.content.contentFrequency,
        educationalResources: intelligence.content.educationalResources,
        seoOpportunities: intelligence.content.seoOpportunities,
        contentStrengths: intelligence.content.contentStrengths,
        contentStrategy: intelligence.content.contentStrategy,
      });
    } catch (err) {
      // Unique analysis_id — another concurrent attempt already wrote profiles.
      const cls = classifyDbError(err);
      if (cls === "DATABASE_WRITE_ERROR") {
        log("warn", "profile_persist_race_recovered", {
          analysisId,
          reportId: report.id,
          error: err instanceof Error ? err.message : String(err),
        });
      } else {
        throw err;
      }
    }

    const insightRows: {
      analysisId: string;
      reportId: string;
      category: string;
      key: string;
      title: string;
      body: string | null;
      present: boolean | null;
      sortOrder: number;
    }[] = [];

    let order = 0;
    for (const item of intelligence.monetization.present) {
      insightRows.push({
        analysisId,
        reportId: report.id,
        category: "monetization",
        key: `present:${item.toLowerCase().replace(/\s+/g, "_")}`,
        title: item,
        body: null,
        present: true,
        sortOrder: order++,
      });
    }
    for (const item of intelligence.monetization.missing) {
      insightRows.push({
        analysisId,
        reportId: report.id,
        category: "monetization",
        key: `missing:${item.toLowerCase().replace(/\s+/g, "_")}`,
        title: item,
        body: null,
        present: false,
        sortOrder: order++,
      });
    }

    const productBuckets: [string, string[]][] = [
      ["products", intelligence.products.products],
      ["services", intelligence.products.services],
      ["free_resources", intelligence.products.freeResources],
      ["digital_products", intelligence.products.digitalProducts],
      ["subscriptions", intelligence.products.subscriptions],
      ["courses", intelligence.products.courses],
      ["consulting", intelligence.products.consulting],
      ["community", intelligence.products.community],
    ];

    for (const [key, items] of productBuckets) {
      for (const item of items) {
        insightRows.push({
          analysisId,
          reportId: report.id,
          category: "product",
          key,
          title: item,
          body: key.replace(/_/g, " "),
          present: true,
          sortOrder: order++,
        });
      }
    }

    const trustFlags: [string, boolean][] = [
      ["testimonials", intelligence.trust.testimonials],
      ["reviews", intelligence.trust.reviews],
      ["case_studies", intelligence.trust.caseStudies],
      ["social_proof", intelligence.trust.socialProof],
      ["credentials", intelligence.trust.credentials],
      ["customer_logos", intelligence.trust.customerLogos],
    ];

    for (const [key, present] of trustFlags) {
      insightRows.push({
        analysisId,
        reportId: report.id,
        category: "trust",
        key,
        title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        body: null,
        present,
        sortOrder: order++,
      });
    }

    for (const detail of intelligence.trust.details) {
      insightRows.push({
        analysisId,
        reportId: report.id,
        category: "trust",
        key: "detail",
        title: detail,
        body: detail,
        present: true,
        sortOrder: order++,
      });
    }

    if (insightRows.length > 0) {
      await db.insert(websiteInsights).values(insightRows);
    }

    await db
      .update(websiteAnalyses)
      .set({ reportId: report.id, scanPhase: "analyzing" })
      .where(eq(websiteAnalyses.id, analysisId));

    await setStage(analysisId, "detecting_gaps");

    let partial = false;
    const moneyGap = await persistMoneyGapEngineResult({
      analysisId,
      reportId: report.id,
      url: analysis.url,
      domain: analysis.website.domain,
      intelligence,
      corpus,
    });
    if (!moneyGap.ok) {
      partial = true;
      log("warn", "money_gap_engine_soft_fail", {
        analysisId,
        reportId: report.id,
        error: moneyGap.error,
        errorClass: "ROADMAP_PERSIST_ERROR",
        severity: "WARNING",
      });
    } else if (moneyGap.partial) {
      partial = true;
    }

    const profileForCompetitive: ScanProfile = isScanProfile(analysis.scanProfile)
      ? analysis.scanProfile
      : "standard";
    // Basics (quick): skip competitive — Scan Engine V3 profile matrix.
    if (profileForCompetitive === "quick") {
      log("info", "competitive_skipped_quick_profile", { analysisId });
      await db
        .update(reports)
        .set({
          competitiveEngineStatus: "skipped",
          competitiveEngineError: null,
        })
        .where(eq(reports.id, report.id));
    } else {
      await setStage(analysisId, "discovering_competitors");
      const competitive = await persistCompetitiveIntelligence({
        analysisId,
        reportId: report.id,
        websiteId: analysis.websiteId,
        ctx: {
          url: analysis.url,
          domain: analysis.website.domain,
          siteName: siteName.slice(0, 120),
          intelligence,
          userCorpus: corpus,
        },
        hooks: {
          onDiscoverDone: () => setStage(analysisId, "profiling_competitors"),
          onProfileStart: () => setStage(analysisId, "profiling_competitors"),
          onAnalyzeStart: () => setStage(analysisId, "competitive_analysis"),
        },
      });
      if (!competitive.ok) {
        partial = true;
        log("warn", "competitive_engine_soft_fail", {
          analysisId,
          reportId: report.id,
          error: competitive.error,
          severity: "WARNING",
        });
      }
    }

    // Complete the customer-facing analysis BEFORE optional monitor/webhooks so
    // serverless death cannot leave the UI stuck on Discovering competitors.
    const durationMs = Date.now() - startedAtMs;
    const priorCompleteMeta =
      ((
        await db.query.websiteAnalyses.findFirst({
          where: eq(websiteAnalyses.id, analysisId),
          columns: { scanMeta: true },
        })
      )?.scanMeta as Record<string, unknown>) ?? {};

    await db
      .update(websiteAnalyses)
      .set({
        reportId: report.id,
        status: "completed",
        scanPhase: "completed",
        stage: "Complete",
        progress: 100,
        completedAt: new Date(),
        durationMs,
        engineVersion: MONEYGAP_ENGINE_VERSION,
        trustVersion: TRUST_ENGINE_VERSION,
        error: null,
        scanMeta: {
          ...priorCompleteMeta,
          partial,
          severity: partial ? "WARNING" : "INFO",
          reportGenerationComplete: true,
          competitiveSkipped: profileForCompetitive === "quick",
        },
      })
      .where(eq(websiteAnalyses.id, analysisId));

    log("info", "SCAN_COMPLETE", {
      analysisId,
      reportId: report.id,
      durationMs,
      partial,
    });
    log("info", "REPORT_GENERATION_COMPLETE", {
      analysisId,
      reportId: report.id,
      durationMs,
      partial,
    });

    try {
      const { runMonitorPostProcess } = await import("@/lib/monitor/post-process");
      await runMonitorPostProcess({
        websiteId: analysis.websiteId,
        reportId: report.id,
        workspaceId: analysis.workspaceId,
        analysisId,
      });
    } catch (err) {
      log("warn", "monitor_post_process_soft_fail", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      const { emitWebhookEvent } = await import("@/lib/platform/webhooks");
      await emitWebhookEvent({
        workspaceId: analysis.workspaceId,
        event: "analysis.completed",
        data: {
          analysis_id: analysisId,
          website_id: analysis.websiteId,
          report_id: report.id,
          money_gap_score: report.moneyGapScore,
        },
      });
      await emitWebhookEvent({
        workspaceId: analysis.workspaceId,
        event: "report.generated",
        data: {
          report_id: report.id,
          website_id: analysis.websiteId,
          money_gap_score: report.moneyGapScore,
        },
      });
      await emitWebhookEvent({
        workspaceId: analysis.workspaceId,
        event: "score.updated",
        data: {
          website_id: analysis.websiteId,
          report_id: report.id,
          money_gap_score: report.moneyGapScore,
          category_scores: report.categoryScores,
        },
      });
      await emitWebhookEvent({
        workspaceId: analysis.workspaceId,
        event: "opportunity.detected",
        data: {
          report_id: report.id,
          website_id: analysis.websiteId,
        },
      });
    } catch (err) {
      log("warn", "api_webhook_emit_soft_fail", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      const { recordUsage } = await import("@/lib/billing");
      await recordUsage({
        workspaceId: analysis.workspaceId,
        userId: analysis.userId,
        type: "report_created",
        meta: { reportId: report.id, analysisId },
      });
    } catch (err) {
      log("warn", "usage_record_soft_fail", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      const refreshed = await db.query.reports.findFirst({
        where: eq(reports.id, report.id),
      });
      const score = refreshed?.moneyGapScore ?? report.moneyGapScore ?? 0;
      await trackProductMetric({
        type: "report_created",
        workspaceId: analysis.workspaceId,
        value: 1,
        meta: { score },
      });
      await trackProductMetric({
        type: "score_snapshot",
        workspaceId: analysis.workspaceId,
        value: score,
      });
      const opps = await db.query.moneyGapOpportunities.findMany({
        where: eq(moneyGapOpportunities.reportId, report.id),
        columns: { category: true },
      });
      const categories = [...new Set(opps.map((o) => o.category).filter(Boolean))];
      for (const category of categories) {
        await trackProductMetric({
          type: "gap_category_seen",
          workspaceId: analysis.workspaceId,
          meta: { category },
        });
      }
    } catch (err) {
      log("warn", "product_metrics_soft_fail", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    log("info", "analysis_completed", {
      analysisId,
      workspaceId: analysis.workspaceId,
      reportId: report.id,
      durationMs,
      engineVersion: MONEYGAP_ENGINE_VERSION,
      trustVersion: TRUST_ENGINE_VERSION,
    });

    try {
      const { recordTimelineEvent } = await import("@/lib/growth-os/timeline");
      const { evaluateAchievements } = await import("@/lib/growth-os/achievements");
      const latestReport = await db.query.reports.findFirst({
        where: eq(reports.id, report.id),
        columns: { moneyGapScore: true },
      });
      const score = latestReport?.moneyGapScore ?? report.moneyGapScore ?? 0;
      await recordTimelineEvent({
        workspaceId: analysis.workspaceId,
        type: "analysis_started",
        title: `Analysis completed for ${siteName.slice(0, 80)}`,
        body: "Website intelligence + MoneyGap Engine finished",
        meta: { analysisId, reportId: report.id },
      });
      if (score >= 90) {
        await recordTimelineEvent({
          workspaceId: analysis.workspaceId,
          type: "score_milestone",
          title: `MoneyGap Score™ hit ${score}`,
          meta: { score, reportId: report.id },
        });
      }
      await evaluateAchievements(analysis.workspaceId);
    } catch (err) {
      log("warn", "growth_os_soft_fail", {
        analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await db
      .update(websites)
      .set({
        name: siteName.slice(0, 120),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(websites.id, analysis.websiteId));
  } catch (err) {
    throw err;
  }
}
