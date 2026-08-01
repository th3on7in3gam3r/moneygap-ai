import { eq } from "drizzle-orm";
import { db } from "@/db";
import type {
  KgPatternCategory,
  KgPatternMaturity,
  KgPatternProfile,
  PatternMatchSnapshot,
  PatternRecommendation,
} from "@/db/schema";
import { kgPatterns } from "@/db/schema";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
import { isActiveStatus } from "@/lib/knowledge-graph/taxonomy";
import { listActiveGoals } from "@/lib/growth-os/goals";

const DEFAULT_PROFILE: KgPatternProfile = {
  applicableIndustries: [],
  applicableBusinessModels: [],
  requiredConditions: [],
  maturityLevels: ["early", "growth", "scale"],
  goalTypes: [],
  implementationSteps: [],
  impactScore: 50,
  revenuePotential: 3,
};

export function deriveMaturity(input: {
  findings: MoneyGapFinding[];
  missingCapabilityCount?: number;
  moneyGapScore?: number | null;
}): KgPatternMaturity {
  const findingCount = input.findings.length;
  const missing = input.missingCapabilityCount ?? 0;
  const score = input.moneyGapScore ?? null;

  if (score !== null && score < 40) return "early";
  if (score !== null && score >= 70 && findingCount < 8) return "scale";
  if (missing >= 6 || findingCount >= 14) return "early";
  if (missing <= 2 && findingCount <= 6) return "scale";
  return "growth";
}

function conditionHits(conditions: string[], hay: string): string[] {
  return conditions.filter((c) => {
    const key = c.toLowerCase();
    return key.length > 2 && hay.includes(key);
  });
}

function scorePattern(input: {
  profile: KgPatternProfile;
  industrySlug: string | null;
  businessModelSlug: string | null;
  hay: string;
  goalTypes: string[];
  maturity: KgPatternMaturity;
  relatedEntitySlugs: string[];
  name: string;
  slug: string;
}): { confidence: number; reasoning: string[] } {
  const reasoning: string[] = [];
  let confidence = 0;

  const inds = input.profile.applicableIndustries;
  if (inds.length > 0) {
    if (!input.industrySlug || !inds.includes(input.industrySlug)) {
      return { confidence: 0, reasoning: ["Excluded: industry allow-list miss"] };
    }
    confidence += 25;
    reasoning.push(`Fits industry ${input.industrySlug}`);
  } else {
    confidence += 10;
    reasoning.push("Industry-agnostic pattern");
  }

  const models = input.profile.applicableBusinessModels;
  if (models.length > 0) {
    if (!input.businessModelSlug || !models.includes(input.businessModelSlug)) {
      return { confidence: 0, reasoning: ["Excluded: business-model allow-list miss"] };
    }
    confidence += 20;
    reasoning.push(`Fits model ${input.businessModelSlug}`);
  } else if (input.businessModelSlug) {
    confidence += 8;
  }

  const condHits = conditionHits(input.profile.requiredConditions, input.hay);
  if (input.profile.requiredConditions.length > 0) {
    const ratio = condHits.length / input.profile.requiredConditions.length;
    confidence += Math.round(20 * Math.min(1, ratio + (condHits.length > 0 ? 0.25 : 0)));
    if (condHits.length > 0) {
      reasoning.push(`Gap/condition cues: ${condHits.slice(0, 3).join(", ")}`);
    } else {
      reasoning.push("Conditions not yet present — opportunity to introduce pattern");
      confidence += 5;
    }
  } else {
    confidence += 8;
  }

  const goalOverlap = input.profile.goalTypes.filter((g) =>
    input.goalTypes.includes(g),
  );
  if (goalOverlap.length > 0) {
    confidence += Math.min(15, goalOverlap.length * 8);
    reasoning.push(`Aligns with goals: ${goalOverlap.join(", ")}`);
  }

  if (
    input.profile.maturityLevels.length === 0 ||
    input.profile.maturityLevels.includes(input.maturity)
  ) {
    confidence += 10;
    reasoning.push(`Suitable for ${input.maturity} maturity`);
  }

  const entityKeys = [
    input.slug,
    input.name,
    ...input.relatedEntitySlugs,
  ].map((x) => x.toLowerCase().replace(/_/g, " "));
  const entityHits = entityKeys.filter((k) => k.length > 2 && input.hay.includes(k));
  if (entityHits.length > 0) {
    confidence += Math.min(10, entityHits.length * 4);
    reasoning.push("Related to current findings");
  }

  return { confidence: Math.min(100, confidence), reasoning };
}

/** Classification-only match for early Engine kgContext (no goals/findings required). */
export async function matchPatternsForContext(
  classification: ClassificationResult,
): Promise<PatternRecommendation[]> {
  const snap = await matchGrowthPatterns({
    classification,
    findings: [],
    corpus: "",
    goalTypes: [],
    maturity: "growth",
    limit: 6,
  });
  return snap.recommendations;
}

export async function matchGrowthPatterns(input: {
  classification: ClassificationResult;
  findings: MoneyGapFinding[];
  corpus: string;
  goalTypes?: string[];
  workspaceId?: string;
  maturity?: KgPatternMaturity;
  missingCapabilityCount?: number;
  moneyGapScore?: number | null;
  limit?: number;
}): Promise<PatternMatchSnapshot> {
  await ensureKnowledgeCatalog();

  let goalTypes = input.goalTypes ?? [];
  if (input.workspaceId && goalTypes.length === 0) {
    try {
      const goals = await listActiveGoals(input.workspaceId);
      goalTypes = [
        ...new Set(goals.map((g) => g.type).filter((t) => t && t !== "custom")),
      ];
    } catch {
      goalTypes = [];
    }
  }

  const maturity =
    input.maturity ??
    deriveMaturity({
      findings: input.findings,
      missingCapabilityCount: input.missingCapabilityCount,
      moneyGapScore: input.moneyGapScore,
    });

  const hay = [
    input.corpus.slice(0, 40000),
    ...input.findings.map(
      (f) => `${f.title} ${f.whatsMissing} ${f.summary} ${f.category} ${f.moduleId}`,
    ),
  ]
    .join(" ")
    .toLowerCase();

  const rows = await db.query.kgPatterns.findMany();
  const recommendations: PatternRecommendation[] = [];

  for (const row of rows) {
    if (!isActiveStatus(row.status)) continue;
    const profile = row.profile ?? DEFAULT_PROFILE;
    const category = (row.category ?? "acquisition") as KgPatternCategory;
    const { confidence, reasoning } = scorePattern({
      profile,
      industrySlug: input.classification.industrySlug,
      businessModelSlug: input.classification.businessModelSlug,
      hay,
      goalTypes,
      maturity,
      relatedEntitySlugs: row.relatedEntitySlugs ?? [],
      name: row.name,
      slug: row.slug,
    });
    if (confidence < 25) continue;

    recommendations.push({
      patternSlug: row.slug,
      name: row.name,
      category,
      confidence,
      reasoning,
      impactScore: profile.impactScore,
      difficulty: row.difficulty,
      revenuePotential: profile.revenuePotential || row.roiEstimate,
      implementationSteps: profile.implementationSteps.slice(0, 4),
    });
  }

  recommendations.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.impactScore - a.impactScore;
  });

  const limit = input.limit ?? 8;
  return {
    maturity,
    goalTypesUsed: goalTypes,
    recommendations: recommendations.slice(0, limit),
    matchedAt: new Date().toISOString(),
  };
}

export async function getPatternNameMap(): Promise<Record<string, string>> {
  const rows = await db.query.kgPatterns.findMany();
  return Object.fromEntries(rows.map((r) => [r.slug, r.name]));
}

export async function getPatternBySlug(slug: string) {
  return db.query.kgPatterns.findFirst({ where: eq(kgPatterns.slug, slug) });
}
