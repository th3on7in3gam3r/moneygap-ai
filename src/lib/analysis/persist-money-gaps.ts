import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  websiteAnalyses,
  websiteClassifications,
  type ConfidenceIntelJson,
  type CrawlabilityReportSnapshot,
  type PrivacyReportSnapshot,
} from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import { runMoneyGapEngine } from "@/lib/analysis/money-gap-engine";
import {
  computeOpportunityRollups,
  normalizeFixes,
  sortOpportunities,
} from "@/lib/analysis/opportunity-rollups";
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
import { log } from "@/lib/observability/logger";
import {
  MONEYGAP_ENGINE_VERSION,
  runTrustEngine,
  TRUST_ENGINE_VERSION,
} from "@/lib/trust";

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
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const heartbeat = async (label: string, progress?: number) => {
    try {
      await db
        .update(websiteAnalyses)
        .set({
          status: "running",
          stage: label,
          ...(progress != null ? { progress } : {}),
        })
        .where(eq(websiteAnalyses.id, input.analysisId));
    } catch {
      /* soft-fail heartbeat */
    }
  };

  try {
    await heartbeat("Running opportunity modules…", 88);

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

    const engineResult = await runMoneyGapEngine({
      url: input.url,
      domain: input.domain,
      intelligence: input.intelligence,
      corpus: input.corpus,
      kgContext,
    });

    await heartbeat("Scoring Growth Roadmap…", 89);

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
      log("warn", "privacy_audit_soft_fail", {
        analysisId: input.analysisId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

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

    const sorted = sortOpportunities(trust.findings);
    const rollups = computeOpportunityRollups({
      ...engineResult,
      opportunities: sorted,
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

    await heartbeat("Saving Growth Roadmap & opportunities…", 90);

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

    log("info", "money_gap_engine_persisted", {
      analysisId: input.analysisId,
      reportId: input.reportId,
      findings: sorted.length,
      qaIssues: trust.qaReport.issues.length,
      engineVersion: MONEYGAP_ENGINE_VERSION,
      trustVersion: TRUST_ENGINE_VERSION,
      confidenceIntelCount: confidencePayloads.length,
      hasIndustryPlaybook: Boolean(industryPlaybook),
      hasIndustryGapReport: Boolean(industryGapReport),
      hasRevenueArchitecture: Boolean(revenueArchitecture),
      hasBusinessModelGapReport: Boolean(businessModelGapReport),
      hasPatternMatchReport: Boolean(patternMatchReport),
      crawlabilityScore: crawlabilitySnapshot?.score ?? null,
      privacyScore: privacySnapshot?.score ?? null,
    });

    return { ok: true };
  } catch (err) {
    log("error", "persistMoneyGapEngineResult", {
      analysisId: input.analysisId,
      error: err instanceof Error ? err.message : String(err),
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

    return { ok: false, error: message };
  }
}
