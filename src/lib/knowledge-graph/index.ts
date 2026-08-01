import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  websiteClassifications,
  type BusinessModelGapSnapshot,
  type IndustryGapSnapshot,
  type IndustryPlaybookSnapshot,
  type PatternMatchSnapshot,
  type RevenueArchitectureSnapshot,
} from "@/db/schema";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import {
  classifyBusiness,
  isBusinessModelSlug,
  isIndustrySlug,
  type ClassificationOverride,
  type ClassificationResult,
} from "@/lib/knowledge-graph/classify";
import {
  buildBusinessModelGapSnapshot,
  buildRevenueArchitectureSnapshot,
} from "@/lib/knowledge-graph/business-model-gaps";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
import { buildIndustryGapSnapshot } from "@/lib/knowledge-graph/industry-gaps";
import { matchGrowthPatterns } from "@/lib/knowledge-graph/pattern-match";
import { resolveIndustryPlaybook } from "@/lib/knowledge-graph/playbooks";
import { applyKnowledgeRules } from "@/lib/knowledge-graph/rules";
import {
  applyBusinessModelSoftScoring,
  applyIndustrySoftScoring,
  applyPatternSoftScoring,
} from "@/lib/knowledge-graph/scoring";
import { log } from "@/lib/observability/logger";

export type KnowledgeGraphPassResult = {
  findings: MoneyGapFinding[];
  classification: ClassificationResult;
  industryPlaybook: IndustryPlaybookSnapshot | null;
  industryGapReport: IndustryGapSnapshot | null;
  revenueArchitecture: RevenueArchitectureSnapshot | null;
  businessModelGapReport: BusinessModelGapSnapshot | null;
  patternMatchReport: PatternMatchSnapshot | null;
};

async function loadOverrideForReport(
  reportId: string,
): Promise<ClassificationOverride | null> {
  const row = await db.query.websiteClassifications.findFirst({
    where: eq(websiteClassifications.reportId, reportId),
  });
  if (!row || row.source !== "override") return null;
  const industryRaw = row.overrideIndustrySlug ?? row.industrySlug;
  const modelRaw = row.overrideBusinessModelSlug ?? row.businessModelSlug;
  return {
    industrySlug:
      industryRaw && isIndustrySlug(industryRaw) ? industryRaw : null,
    businessModelSlug:
      modelRaw && isBusinessModelSlug(modelRaw) ? modelRaw : null,
  };
}

/** Engine findings → KG classify/rules/soft-score/gaps/patterns. Soft-fail safe for callers. */
export async function runKnowledgeGraphPass(input: {
  analysisId: string;
  reportId: string;
  intelligence: IntelligenceResult;
  corpus: string;
  findings: MoneyGapFinding[];
  override?: ClassificationOverride | null;
  workspaceId?: string;
  moneyGapScore?: number | null;
}): Promise<KnowledgeGraphPassResult> {
  await ensureKnowledgeCatalog();

  const storedOverride =
    input.override !== undefined
      ? input.override
      : await loadOverrideForReport(input.reportId);

  const classification = classifyBusiness(input.intelligence, {
    corpus: input.corpus,
    override: storedOverride,
  });

  let findings = await applyKnowledgeRules(
    input.findings,
    classification,
    input.intelligence,
    input.corpus,
  );
  findings = await applyIndustrySoftScoring(findings, classification);
  findings = await applyBusinessModelSoftScoring(findings, classification);

  const industryPlaybook = await resolveIndustryPlaybook(classification);
  const industryGapReport = await buildIndustryGapSnapshot({
    classification,
    intelligence: input.intelligence,
    corpus: input.corpus,
    findings,
  });
  const revenueArchitecture = await buildRevenueArchitectureSnapshot({
    classification,
    intelligence: input.intelligence,
    corpus: input.corpus,
    findings,
  });
  const businessModelGapReport = await buildBusinessModelGapSnapshot({
    classification,
    intelligence: input.intelligence,
    corpus: input.corpus,
    findings,
    revenueArchitecture,
  });

  const missingCapabilityCount =
    (industryGapReport?.missingCapabilities.length ?? 0) +
    (businessModelGapReport?.missingCapabilities.length ?? 0);

  const patternMatchReport = await matchGrowthPatterns({
    classification,
    findings,
    corpus: input.corpus,
    workspaceId: input.workspaceId,
    missingCapabilityCount,
    moneyGapScore: input.moneyGapScore,
  });

  findings = await applyPatternSoftScoring(
    findings,
    classification,
    patternMatchReport.recommendations,
  );

  const existing = await db.query.websiteClassifications.findFirst({
    where: eq(websiteClassifications.analysisId, input.analysisId),
  });

  const classificationPatch = {
    reportId: input.reportId,
    industrySlug: classification.industrySlug,
    businessModelSlug: classification.businessModelSlug,
    confidence: classification.confidence,
    signals: classification.signals,
    modelEvidence: classification.modelEvidence,
    source: classification.source,
    ...(classification.source === "override"
      ? {
          overrideIndustrySlug: classification.industrySlug,
          overrideBusinessModelSlug: classification.businessModelSlug,
        }
      : {}),
  };

  if (existing) {
    await db
      .update(websiteClassifications)
      .set(classificationPatch)
      .where(eq(websiteClassifications.id, existing.id));
  } else {
    await db.insert(websiteClassifications).values({
      analysisId: input.analysisId,
      ...classificationPatch,
      overrideIndustrySlug:
        classification.source === "override" ? classification.industrySlug : null,
      overrideBusinessModelSlug:
        classification.source === "override" ? classification.businessModelSlug : null,
    });
  }

  log("info", "knowledge_graph_pass", {
    analysisId: input.analysisId,
    industry: classification.industrySlug,
    model: classification.businessModelSlug,
    confidence: classification.confidence,
    source: classification.source,
    boosted: findings.filter((f) => (f.kgMeta?.priorityBoost ?? 0) > 0).length,
    hasGapReport: Boolean(industryGapReport),
    hasBmGapReport: Boolean(businessModelGapReport),
    patternCount: patternMatchReport.recommendations.length,
    maturity: patternMatchReport.maturity,
  });

  return {
    findings,
    classification,
    industryPlaybook,
    industryGapReport,
    revenueArchitecture,
    businessModelGapReport,
    patternMatchReport,
  };
}

export { KNOWLEDGE_GRAPH_VERSION } from "@/lib/knowledge-graph/taxonomy";
export {
  classifyBusiness,
  isIndustrySlug,
  isBusinessModelSlug,
} from "@/lib/knowledge-graph/classify";
export type {
  ClassificationResult,
  ClassificationOverride,
  ClassificationSource,
} from "@/lib/knowledge-graph/classify";
export { buildEngineKgContext } from "@/lib/knowledge-graph/context";
export { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
export { applyKnowledgeRules } from "@/lib/knowledge-graph/rules";
export {
  applyIndustrySoftScoring,
  applyBusinessModelSoftScoring,
  applyPatternSoftScoring,
} from "@/lib/knowledge-graph/scoring";
export { resolveIndustryPlaybook } from "@/lib/knowledge-graph/playbooks";
export { buildIndustryGapSnapshot } from "@/lib/knowledge-graph/industry-gaps";
export {
  buildBusinessModelGapSnapshot,
  buildRevenueArchitectureSnapshot,
} from "@/lib/knowledge-graph/business-model-gaps";
export {
  matchGrowthPatterns,
  matchPatternsForContext,
  deriveMaturity,
} from "@/lib/knowledge-graph/pattern-match";
export {
  loadActiveRecommendations,
  setRecommendationStatus,
  updateRecommendation,
} from "@/lib/knowledge-graph/recommendations";
export {
  listKnowledgeOverview,
  setRuleEnabled,
  updateRule,
  setIndustryStatus,
  setPatternStatus,
  updateIndustryProfile,
  setBusinessModelStatus,
  updateBusinessModelProfile,
  updatePatternProfile,
  setPlaybookStatus,
  updatePlaybook,
  getIndustry,
  getPlaybook,
  getPattern,
} from "@/lib/knowledge-graph/admin";
