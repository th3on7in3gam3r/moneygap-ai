import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  websiteAnalyses,
  websiteClassifications,
  competitors,
  type ConfidenceIntelJson,
  type CrawlabilityReportSnapshot,
  type PrivacyReportSnapshot,
} from "@/db/schema";
import { estimateTokenCount } from "@/lib/analysis/corpus";
import {
  claimMoneyGapEngine,
  releaseMoneyGapClaim,
  touchMoneyGapProgress,
} from "@/lib/analysis/money-gap-claim";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import { runMoneyGapEngine } from "@/lib/analysis/money-gap-engine";
import {
  computeOpportunityRollups,
  normalizeFixes,
  sortOpportunities,
} from "@/lib/analysis/opportunity-rollups";
import {
  classifyRoadmapError,
  getMoneyGapEngineDeadlineMs,
  MAX_PERSISTED_OPPORTUNITIES,
} from "@/lib/analysis/roadmap-errors";
import { MONEY_GAP_ENGINE_ERROR } from "@/lib/analysis/stages";
import {
  createConfidenceSnapshot,
  enrichOpportunityConfidence,
  isConfidenceIntelEnabled,
} from "@/lib/confidence";
import {
  crawlabilityFindingsToMoneyGaps,
  runCrawlabilityAudit,
} from "@/lib/crawlability";
import {
  privacyFindingsToMoneyGaps,
  runPrivacyAudit,
} from "@/lib/privacy";
import { getTechProfile } from "@/lib/developer/memory";
import {
  buildEngineKgContext,
  classifyBusiness,
  ensureKnowledgeCatalog,
  isIndustrySlug,
  isBusinessModelSlug,
  runKnowledgeGraphPass,
  type ClassificationOverride,
} from "@/lib/knowledge-graph";
import { runOpportunityIntelligencePass } from "@/lib/opportunity-intelligence";
import { log } from "@/lib/observability/logger";
import {
  MONEYGAP_ENGINE_VERSION,
  runTrustEngine,
  TRUST_ENGINE_VERSION,
} from "@/lib/trust";

function roadmapActionCount(roadmap: {
  today?: unknown[];
  thisWeek?: unknown[];
  thisMonth?: unknown[];
  nextQuarter?: unknown[];
}): number {
  return (
    (roadmap.today?.length ?? 0) +
    (roadmap.thisWeek?.length ?? 0) +
    (roadmap.thisMonth?.length ?? 0) +
    (roadmap.nextQuarter?.length ?? 0)
  );
}

async function loadStoredOverride(
  reportId: string,
): Promise<ClassificationOverride | null> {
  const row = await db.query.websiteClassifications.findFirst({
    where: eq(websiteClassifications.reportId, reportId),
  });
  if (!row || row.source !== "override") return null;
  const industry = row.overrideIndustrySlug ?? row.industrySlug;
  if (!industry || !isIndustrySlug(industry)) return null;
  const model = row.overrideBusinessModelSlug ?? row.businessModelSlug;
  return {
    industrySlug: industry,
    businessModelSlug:
      model && isBusinessModelSlug(model) ? model : null,
  };
}

export async function persistMoneyGapEngineResult(input: {
  analysisId: string;
  reportId: string;
  url: string;
  domain: string;
  intelligence: IntelligenceResult;
  corpus: string;
}): Promise<{ ok: true; partial?: boolean } | { ok: false; error: string }> {
  const startedAtMs = Date.now();
  const claim = await claimMoneyGapEngine(input.analysisId);
  if (!claim.claimed) {
    log("info", "money_gap_engine_skipped", {
      analysisId: input.analysisId,
      reason: claim.reason,
    });
    if (
      claim.reason === "engine_completed" ||
      claim.reason === "already_complete"
    ) {
      return { ok: true, partial: false };
    }
    if (claim.reason === "already_claimed" || claim.reason === "lost_race") {
      // Another worker owns the stage — do not fail the scan.
      return { ok: true, partial: true };
    }
    return { ok: false, error: `Money Gap claim failed: ${claim.reason}` };
  }

  const heartbeat = async (label: string, progress?: number) => {
    try {
      const current = await db.query.websiteAnalyses.findFirst({
        where: eq(websiteAnalyses.id, input.analysisId),
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
        .where(eq(websiteAnalyses.id, input.analysisId));
      await touchMoneyGapProgress(input.analysisId, {});
    } catch {
      /* soft-fail heartbeat */
    }
  };

  let partial = false;

  try {
    const deadlineMs = getMoneyGapEngineDeadlineMs();
    const deadlineAtMs = startedAtMs + deadlineMs;
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    log("info", "ROADMAP_GENERATION_START", {
      analysisId: input.analysisId,
      reportId: input.reportId,
      deadlineMs,
      inputChars: input.corpus.length,
      estimatedTokens: estimateTokenCount(input.corpus),
      model,
    });

    // Category scoring — keep UI off "Building Fix Roadmap" until modules finish.
    await heartbeat("Scoring MoneyGap Categories™…", 76);

    let kgContext: string | undefined;
    try {
      await ensureKnowledgeCatalog();
      const override = await loadStoredOverride(input.reportId);
      const earlyClassification = classifyBusiness(input.intelligence, {
        corpus: input.corpus,
        override,
      });
      kgContext = await buildEngineKgContext(
        earlyClassification,
        input.intelligence,
      );
      if (kgContext) {
        log("info", "knowledge_graph_engine_context", {
          analysisId: input.analysisId,
          industry: earlyClassification.industrySlug,
          source: earlyClassification.source,
          chars: kgContext.length,
        });
      }
    } catch (err) {
      log("warn", "knowledge_graph_context_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const engineResult = await runMoneyGapEngine(
      {
        url: input.url,
        domain: input.domain,
        intelligence: input.intelligence,
        corpus: input.corpus,
        kgContext,
      },
      {
        deadlineAtMs,
        onProgress: async (p) => {
          const label =
            p.modulesCompleted === 0
              ? "Scoring MoneyGap Categories™…"
              : `Scoring MoneyGap Categories™… ${p.modulesCompleted} of ${p.modulesTotal}`;
          const progress = Math.min(
            86,
            76 +
              Math.round(
                (p.modulesCompleted / Math.max(1, p.modulesTotal)) * 10,
              ),
          );
          await heartbeat(label, progress);
          await touchMoneyGapProgress(input.analysisId, {
            moneyGapModulesCompleted: p.modulesCompleted,
            moneyGapModulesTotal: p.modulesTotal,
          });
        },
      },
    );

    if (engineResult.partial) partial = true;

    await heartbeat("Deepening category findings…", 86);

    let crawlabilitySnapshot: CrawlabilityReportSnapshot | null = null;
    let crawlabilityGaps: ReturnType<typeof crawlabilityFindingsToMoneyGaps> = [];
    try {
      await heartbeat("Checking crawlability & privacy…", 90);
      const reportMeta = await db.query.reports.findFirst({
        where: eq(reports.id, input.reportId),
        columns: { workspaceId: true, websiteId: true },
      });
      const crawl = await runCrawlabilityAudit(input.url, {
        workspaceId: reportMeta?.workspaceId,
        maxPages: 10,
        maxLinkChecks: 12,
      });
      crawlabilityGaps = crawlabilityFindingsToMoneyGaps(crawl.findings);

      let previousScore: number | null = null;
      if (reportMeta?.websiteId) {
        const prev = await db.query.reports.findFirst({
          where: and(
            eq(reports.websiteId, reportMeta.websiteId),
            eq(reports.type, "intelligence"),
            ne(reports.id, input.reportId),
          ),
          orderBy: [desc(reports.createdAt)],
          columns: { crawlabilityReport: true },
        });
        previousScore = prev?.crawlabilityReport?.score ?? null;
      }
      const delta =
        crawl.score != null && previousScore != null
          ? crawl.score - previousScore
          : null;

      crawlabilitySnapshot = {
        score: crawl.score,
        status: crawl.status,
        contributors: crawl.contributors,
        executiveSummary: crawl.executiveSummary,
        estimatedImprovement: crawl.estimatedImprovement,
        unavailableReasons: crawl.unavailableReasons,
        previousScore,
        delta,
        findingCount: crawl.findings.length,
      };
    } catch (err) {
      partial = true;
      log("warn", "crawlability_audit_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let privacySnapshot: PrivacyReportSnapshot | null = null;
    let privacyGaps: ReturnType<typeof privacyFindingsToMoneyGaps> = [];
    try {
      const reportMeta = await db.query.reports.findFirst({
        where: eq(reports.id, input.reportId),
        columns: { workspaceId: true, websiteId: true },
      });
      const privacy = await runPrivacyAudit(input.url, {
        workspaceId: reportMeta?.workspaceId,
      });
      privacyGaps = privacyFindingsToMoneyGaps(privacy.findings);

      let previousScore: number | null = null;
      if (reportMeta?.websiteId) {
        const prev = await db.query.reports.findFirst({
          where: and(
            eq(reports.websiteId, reportMeta.websiteId),
            eq(reports.type, "intelligence"),
            ne(reports.id, input.reportId),
          ),
          orderBy: [desc(reports.createdAt)],
          columns: { privacyReport: true },
        });
        previousScore = prev?.privacyReport?.score ?? null;
      }
      const delta =
        privacy.score != null && previousScore != null
          ? privacy.score - previousScore
          : null;

      privacySnapshot = {
        score: privacy.score,
        status: privacy.status,
        contributors: privacy.contributors,
        executiveSummary: privacy.executiveSummary,
        estimatedImprovement: privacy.estimatedImprovement,
        unavailableReasons: privacy.unavailableReasons,
        previousScore,
        delta,
        findingCount: privacy.findings.length,
        trackingDetected: privacy.trackingDetected,
      };
    } catch (err) {
      partial = true;
      log("warn", "privacy_audit_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await heartbeat("Building Fix Roadmap…", 88);

    let findings = [
      ...engineResult.opportunities,
      ...crawlabilityGaps,
      ...privacyGaps,
    ];
    let industryPlaybook = null as Awaited<
      ReturnType<typeof runKnowledgeGraphPass>
    >["industryPlaybook"];
    let industryGapReport = null as Awaited<
      ReturnType<typeof runKnowledgeGraphPass>
    >["industryGapReport"];
    let revenueArchitecture = null as Awaited<
      ReturnType<typeof runKnowledgeGraphPass>
    >["revenueArchitecture"];
    let businessModelGapReport = null as Awaited<
      ReturnType<typeof runKnowledgeGraphPass>
    >["businessModelGapReport"];
    let patternMatchReport = null as Awaited<
      ReturnType<typeof runKnowledgeGraphPass>
    >["patternMatchReport"];

    try {
      const reportRow = await db.query.reports.findFirst({
        where: eq(reports.id, input.reportId),
      });
      const kg = await runKnowledgeGraphPass({
        analysisId: input.analysisId,
        reportId: input.reportId,
        intelligence: input.intelligence,
        corpus: input.corpus,
        findings,
        workspaceId: reportRow?.workspaceId,
        moneyGapScore: reportRow?.moneyGapScore ?? null,
      });
      findings = kg.findings;
      industryPlaybook = kg.industryPlaybook;
      industryGapReport = kg.industryGapReport;
      revenueArchitecture = kg.revenueArchitecture;
      businessModelGapReport = kg.businessModelGapReport;
      patternMatchReport = kg.patternMatchReport;
    } catch (err) {
      partial = true;
      log("warn", "knowledge_graph_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const trust = runTrustEngine(findings, {
      corpusChars: input.corpus.length,
      industryKnown: Boolean(input.intelligence.business?.industry),
    });

    if (trust.suppressed.length > 0) {
      log("info", "trust_engine_suppressed", {
        analysisId: input.analysisId,
        count: trust.suppressed.length,
        titles: trust.suppressed.map((s) => s.title).slice(0, 8),
      });
    }

    const sortedAll = sortOpportunities(trust.findings);
    const sorted = sortedAll.slice(0, MAX_PERSISTED_OPPORTUNITIES);
    if (sortedAll.length > sorted.length) partial = true;

    const rollups = computeOpportunityRollups({
      ...engineResult,
      opportunities: sorted,
    });

    const actionCount = roadmapActionCount(engineResult.growthRoadmap);
    log("info", "ROADMAP_PERSIST_START", {
      analysisId: input.analysisId,
      reportId: input.reportId,
      actionCount,
      opportunityCount: sorted.length,
      model,
    });

    const reportRowForWs = await db.query.reports.findFirst({
      where: eq(reports.id, input.reportId),
      columns: { workspaceId: true },
    });

    const confidencePayloads: ConfidenceIntelJson[] = [];
    type TechRow = NonNullable<Awaited<ReturnType<typeof getTechProfile>>>;
    let techProfile: TechRow | null = null;
    if (isConfidenceIntelEnabled() && reportRowForWs?.workspaceId) {
      try {
        techProfile =
          (await getTechProfile(reportRowForWs.workspaceId)) ?? null;
      } catch {
        techProfile = null;
      }
    }

    await db
      .delete(moneyGapOpportunities)
      .where(eq(moneyGapOpportunities.reportId, input.reportId));

    if (sorted.length > 0) {
      const confCtx = {
        corpusChars: input.corpus.length,
        hasTechProfile: Boolean(techProfile),
        techProfile: techProfile?.stack ?? null,
      };

      await db.insert(moneyGapOpportunities).values(
        sorted.map((o, index) => {
          let confidenceIntel: ConfidenceIntelJson | null = null;
          if (isConfidenceIntelEnabled()) {
            try {
              confidenceIntel = enrichOpportunityConfidence(o, confCtx);
              confidencePayloads.push(confidenceIntel);
            } catch (err) {
              log("warn", "confidence_intel_enrich_soft_fail", {
                analysisId: input.analysisId,
                title: o.title,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
          return {
            reportId: input.reportId,
            analysisId: input.analysisId,
            moduleId: o.moduleId,
            title: o.title,
            category: o.category,
            detectionStatus: o.detectionStatus,
            summary: o.summary,
            whatsMissing: o.whatsMissing,
            whyItMatters: o.whyItMatters,
            businessImpact: o.businessImpact,
            estimatedAnnualRevenue: o.estimatedAnnualRevenue,
            estimatedLeads: o.estimatedLeads,
            estimatedTraffic: o.estimatedTraffic,
            estimatedConversionLift: o.estimatedConversionLift,
            estimateRationale: o.estimateRationale,
            confidence: o.confidence,
            likelyCauses: o.likelyCauses,
            fixes: normalizeFixes(o.fixes),
            helpfulResources: o.helpfulResources ?? [],
            severity: o.severity,
            difficulty: o.difficulty,
            estimatedTime: o.estimatedTime,
            expectedRoi: o.expectedRoi,
            opportunityIndex: o.opportunityIndex,
            priorityScore: o.priorityScore,
            sortOrder: index,
            status: "open",
            implementationStatus: "open",
            lifecycleStatus: "detected",
            evidenceSummary: o.evidenceSummary ?? null,
            supportingSignals: o.supportingSignals ?? [],
            businessReasoning: o.businessReasoning ?? null,
            detectionSource: o.detectionSource ?? `module:${o.moduleId}`,
            confidenceLevel: o.confidenceLevel ?? null,
            trustMeta: o.trustMeta ?? null,
            kgMeta: o.kgMeta ?? null,
            confidenceIntel,
          };
        }),
      );
    }

    if (
      isConfidenceIntelEnabled() &&
      reportRowForWs?.workspaceId &&
      confidencePayloads.length > 0
    ) {
      try {
        await createConfidenceSnapshot({
          workspaceId: reportRowForWs.workspaceId,
          reportId: input.reportId,
          payloads: confidencePayloads,
        });
      } catch (err) {
        log("warn", "confidence_snapshot_soft_fail", {
          analysisId: input.analysisId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await heartbeat(
      actionCount > 0
        ? `Building Fix Roadmap… ${actionCount} actions prepared`
        : "Building Fix Roadmap…",
      90,
    );

    await db
      .update(reports)
      .set({
        moneyGapScore: rollups.moneyGapScore,
        revenueAtRisk: rollups.revenueAtRisk,
        capturePotential: rollups.capturePotential,
        opportunitySummary: rollups.opportunitySummary,
        executiveBrief: rollups.executiveBrief,
        categoryScores: engineResult.categoryScores,
        growthRoadmap: engineResult.growthRoadmap,
        industryPlaybook: industryPlaybook,
        industryGapReport: industryGapReport,
        revenueArchitecture: revenueArchitecture,
        businessModelGapReport: businessModelGapReport,
        patternMatchReport: patternMatchReport,
        crawlabilityReport: crawlabilitySnapshot,
        privacyReport: privacySnapshot,
        moneyGapEngineStatus: "completed",
        moneyGapEngineError: null,
      })
      .where(eq(reports.id, input.reportId));

    log("info", "ROADMAP_PERSIST_COMPLETE", {
      analysisId: input.analysisId,
      reportId: input.reportId,
      actionCount,
      opportunityCount: sorted.length,
      durationMs: Date.now() - startedAtMs,
      partial,
    });

    // Opportunity Intelligence™ + Growth Graph™ (soft-fail)
    try {
      await heartbeat("Building Opportunity Intelligence™…", 92);
      const reportMeta = await db.query.reports.findFirst({
        where: eq(reports.id, input.reportId),
        columns: {
          workspaceId: true,
          websiteId: true,
          moneyGapScore: true,
          competitiveAnalysis: true,
        },
      });
      if (reportMeta?.workspaceId && reportMeta.websiteId) {
        const comps = await db.query.competitors.findMany({
          where: eq(competitors.websiteId, reportMeta.websiteId),
          columns: { name: true },
          limit: 10,
        });
        const gapTitles = [
          ...(reportMeta.competitiveAnalysis?.opportunityGaps ?? []),
          ...(reportMeta.competitiveAnalysis?.contentGaps ?? []),
        ]
          .map((g) => g.title)
          .filter(Boolean)
          .slice(0, 8);

        await runOpportunityIntelligencePass({
          analysisId: input.analysisId,
          reportId: input.reportId,
          workspaceId: reportMeta.workspaceId,
          websiteId: reportMeta.websiteId,
          domain: input.domain,
          url: input.url,
          intelligence: input.intelligence,
          corpus: input.corpus,
          moneyGapScore: reportMeta.moneyGapScore ?? rollups.moneyGapScore,
          competitorNames: comps.map((c) => c.name),
          competitorGapTitles: gapTitles,
        });
      }
    } catch (err) {
      partial = true;
      log("warn", "opportunity_intelligence_hook_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    log("info", "ROADMAP_STAGE_COMPLETE", {
      analysisId: input.analysisId,
      reportId: input.reportId,
      durationMs: Date.now() - startedAtMs,
      actionCount,
      opportunityCount: sorted.length,
      modulesFailed: engineResult.modulesFailed,
      partial,
      model,
      engineVersion: MONEYGAP_ENGINE_VERSION,
      trustVersion: TRUST_ENGINE_VERSION,
    });

    await releaseMoneyGapClaim(input.analysisId, {
      partial,
      severity: partial ? "WARNING" : "INFO",
    });

    return { ok: true, partial };
  } catch (err) {
    const errorClass = classifyRoadmapError(err);
    log("error", "persistMoneyGapEngineResult", {
      analysisId: input.analysisId,
      errorClass,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAtMs,
    });
    const message =
      err instanceof Error && err.message === MONEY_GAP_ENGINE_ERROR
        ? err.message
        : MONEY_GAP_ENGINE_ERROR;

    await db
      .update(reports)
      .set({
        moneyGapEngineStatus: "failed",
        moneyGapEngineError: message,
      })
      .where(eq(reports.id, input.reportId));

    await releaseMoneyGapClaim(input.analysisId, {
      errorClass,
      severity: "FATAL",
      errorMessage: err instanceof Error ? err.message : String(err),
    });

    return { ok: false, error: message };
  }
}
