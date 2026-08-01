import { eq } from "drizzle-orm";
import { db } from "@/db";
import type {
  BusinessModelGapSnapshot,
  KgBusinessModelProfile,
  RevenueArchitectureSnapshot,
  RevenueArchitectureStageStatus,
} from "@/db/schema";
import { kgBusinessModels } from "@/db/schema";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";

function featurePresent(feature: string, hay: string): boolean {
  const f = feature.toLowerCase();
  const tokens = f.split(/\s+/).filter((t) => t.length > 3);
  if (hay.includes(f)) return true;
  if (tokens.length === 0) return false;
  return tokens.every((t) => hay.includes(t));
}

function stageStatus(stageId: string, label: string, hay: string): {
  status: RevenueArchitectureStageStatus;
  evidence?: string;
} {
  const keys = [stageId, label, ...label.toLowerCase().split(/\s+/)].map((k) =>
    k.toLowerCase(),
  );
  const hitCount = keys.filter((k) => k.length > 2 && hay.includes(k)).length;
  if (hitCount >= 2) return { status: "present", evidence: `Signals for ${label} detected.` };
  if (hitCount === 1) return { status: "weak", evidence: `Weak signals for ${label}.` };
  return { status: "missing", evidence: `${label} stage not clearly present.` };
}

function moduleForLabel(label: string): string | undefined {
  const l = label.toLowerCase();
  if (/(trial|demo|checkout|quote|book|cta|cart|donate|giv|form)/.test(l)) return "conversion";
  if (/(review|case study|logo|testimonial|trust|security)/.test(l)) return "trust";
  if (/(pricing|membership|product|revenue|billing)/.test(l)) return "revenue";
  if (/(newsletter|email|nurture|crm)/.test(l)) return "marketing";
  if (/(onboard|retention|churn)/.test(l)) return "customer";
  return undefined;
}

function defaultProfile(): KgBusinessModelProfile {
  return {
    revenueStructure: [],
    customerJourney: [],
    growthLevers: [],
    commonGaps: [],
    trustRequirements: [],
    conversionPatterns: [],
    retentionStrategies: [],
    revenueStages: [
      { id: "visitor", label: "Visitor" },
      { id: "lead", label: "Lead" },
      { id: "customer", label: "Customer" },
      { id: "retention", label: "Retention" },
    ],
  };
}

export async function buildRevenueArchitectureSnapshot(input: {
  classification: ClassificationResult;
  intelligence: IntelligenceResult;
  corpus: string;
  findings: MoneyGapFinding[];
}): Promise<RevenueArchitectureSnapshot | null> {
  await ensureKnowledgeCatalog();
  const slug = input.classification.businessModelSlug;
  if (!slug) return null;

  const model = await db.query.kgBusinessModels.findFirst({
    where: eq(kgBusinessModels.slug, slug),
  });
  if (!model) return null;

  const profile = model.profile ?? defaultProfile();
  const hay = [
    input.corpus.slice(0, 50000),
    JSON.stringify(input.intelligence),
    ...input.findings.map((f) => `${f.title} ${f.whatsMissing}`),
  ]
    .join(" ")
    .toLowerCase();

  const stages = (profile.revenueStages.length
    ? profile.revenueStages
    : defaultProfile().revenueStages
  ).map((s) => {
    const { status, evidence } = stageStatus(s.id, s.label, hay);
    return {
      id: s.id,
      label: s.label,
      description: s.description,
      status,
      evidence,
    };
  });

  return {
    businessModelSlug: model.slug,
    businessModelName: model.name,
    stages,
  };
}

export async function buildBusinessModelGapSnapshot(input: {
  classification: ClassificationResult;
  intelligence: IntelligenceResult;
  corpus: string;
  findings: MoneyGapFinding[];
  opportunityIdsByTitle?: Record<string, string>;
  revenueArchitecture?: RevenueArchitectureSnapshot | null;
}): Promise<BusinessModelGapSnapshot | null> {
  await ensureKnowledgeCatalog();
  const slug = input.classification.businessModelSlug;
  if (!slug) return null;

  const model = await db.query.kgBusinessModels.findFirst({
    where: eq(kgBusinessModels.slug, slug),
  });
  if (!model) return null;

  const profile = model.profile ?? defaultProfile();
  const hay = [
    input.corpus.slice(0, 50000),
    JSON.stringify(input.intelligence),
    ...input.findings.map((f) => `${f.title} ${f.whatsMissing} ${f.summary}`),
  ]
    .join(" ")
    .toLowerCase();

  const expected = profile.benchmarks?.expectedCapabilities ?? [];
  const missingCapabilities: BusinessModelGapSnapshot["missingCapabilities"] = expected
    .filter((feat) => !featurePresent(feat, hay))
    .map((label) => ({
      label,
      evidence: `Not clearly detected vs ${model.name} peer capabilities.`,
      moduleId: moduleForLabel(label),
    }));

  for (const g of profile.commonGaps.slice(0, 4)) {
    if (!missingCapabilities.some((m) => m.label.toLowerCase() === g.toLowerCase())) {
      missingCapabilities.push({
        label: g,
        evidence: "Common business-model gap pattern.",
        moduleId: moduleForLabel(g),
      });
    }
  }

  for (const stage of input.revenueArchitecture?.stages ?? []) {
    if (stage.status === "missing") {
      const label = `Missing stage: ${stage.label}`;
      if (!missingCapabilities.some((m) => m.label === label)) {
        missingCapabilities.push({
          label,
          evidence: stage.evidence ?? "Stage not detected in site corpus.",
          moduleId: moduleForLabel(stage.label),
        });
      }
    }
  }

  const competitorPatterns = [
    ...profile.conversionPatterns.map((p) => `Peers convert via: ${p}`),
    ...profile.growthLevers.slice(0, 3).map((p) => `Peers grow via: ${p}`),
    ...profile.retentionStrategies.slice(0, 2).map((p) => `Peers retain via: ${p}`),
  ].slice(0, 8);

  const gapHay = missingCapabilities.map((m) => m.label.toLowerCase()).join(" ");
  const priorityOpportunities = [...input.findings]
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    .filter((f) => {
      const t = `${f.title} ${f.whatsMissing}`.toLowerCase();
      return gapHay.split(/\s+/).some((w) => w.length > 4 && t.includes(w));
    })
    .slice(0, 5)
    .map((f) => ({
      title: f.title,
      opportunityId: input.opportunityIdsByTitle?.[f.title],
      reason: `Addresses ${model.name} revenue architecture gaps.`,
    }));

  if (priorityOpportunities.length === 0) {
    for (const f of [...input.findings]
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      .slice(0, 3)) {
      priorityOpportunities.push({
        title: f.title,
        opportunityId: input.opportunityIdsByTitle?.[f.title],
        reason: `High-impact for ${model.name} model.`,
      });
    }
  }

  const expectedCount = Math.max(1, expected.length || profile.commonGaps.length || 1);
  const missingCount = missingCapabilities.length;
  const businessModelFitScore = Math.max(
    15,
    Math.min(95, Math.round(((expectedCount - Math.min(missingCount, expectedCount)) / expectedCount) * 100) - missingCount),
  );

  return {
    businessModelSlug: model.slug,
    businessModelName: model.name,
    confidence: input.classification.confidence,
    source: input.classification.source,
    benchmarkSummary:
      profile.benchmarks?.notes ??
      model.description ??
      `${model.name} peers emphasize ${profile.growthLevers.slice(0, 3).join(", ")}.`,
    missingCapabilities: missingCapabilities.slice(0, 10),
    competitorPatterns,
    priorityOpportunities,
    businessModelFitScore,
    modelEvidence: input.classification.modelEvidence,
  };
}
