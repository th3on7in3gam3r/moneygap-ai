import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kgBusinessModels, kgIndustries } from "@/db/schema";
import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
import { isActiveStatus } from "@/lib/knowledge-graph/taxonomy";

/** Soft priority boost from industry expectation gaps — does not change OI formula. */
export async function applyIndustrySoftScoring(
  findings: MoneyGapFinding[],
  classification: ClassificationResult,
): Promise<MoneyGapFinding[]> {
  await ensureKnowledgeCatalog();
  if (!classification.industrySlug) return findings;

  const industry = await db.query.kgIndustries.findFirst({
    where: eq(kgIndustries.slug, classification.industrySlug),
  });
  if (!industry || !isActiveStatus(industry.status)) return findings;

  const expectations = [
    ...industry.profile.trustSignals,
    ...industry.profile.websiteFeatures,
    ...industry.profile.growthPriorities,
    ...(industry.profile.commonGaps ?? []),
    ...(industry.profile.benchmarks?.expectedFeatures ?? []),
  ].map((s) => s.toLowerCase());

  const patterns = await db.query.kgPatterns.findMany();

  return findings.map((f) => {
    const hay = `${f.title} ${f.whatsMissing} ${f.category} ${f.moduleId}`.toLowerCase();
    const expectationHits = expectations.filter((e) =>
      hay.split(/\s+/).some((w) => e.includes(w) || w.includes(e.split(" ")[0] ?? "")),
    );
    const commonGapHits = (industry.profile.commonGaps ?? []).filter((g) => {
      const tokens = g.toLowerCase().replace(/^no |^missing |^weak /g, "").split(/\s+/);
      return tokens.some((t) => t.length > 3 && hay.includes(t));
    });
    // Light fallback pattern hits (primary pattern soft scoring is applyPatternSoftScoring)
    const patternHits = patterns
      .filter((p) => {
        if (!isActiveStatus(p.status)) return false;
        const keys = [p.slug, p.name].map((x) => x.toLowerCase());
        return keys.some((k) => hay.includes(k.replace(/_/g, " ")) || hay.includes(k));
      })
      .map((p) => p.slug)
      .slice(0, 3);

    const softBoost =
      Math.min(10, expectationHits.length * 2) + Math.min(8, commonGapHits.length * 3);

    const industryFitNote =
      commonGapHits.length > 0
        ? `Closes ${industry.name} common gap: ${commonGapHits[0]}`
        : expectationHits.length > 0
          ? `Matches ${industry.name} peer expectation`
          : undefined;

    if (softBoost <= 0) {
      return {
        ...f,
        kgMeta: {
          ...f.kgMeta,
          industrySlug: classification.industrySlug ?? undefined,
          businessModelSlug: classification.businessModelSlug ?? undefined,
          patternHits: f.kgMeta?.patternHits ?? patternHits,
          industryFitNote,
        },
      };
    }

    return {
      ...f,
      priorityScore: Math.min(100, (f.priorityScore ?? 50) + softBoost),
      kgMeta: {
        ...f.kgMeta,
        industrySlug: classification.industrySlug ?? undefined,
        businessModelSlug: classification.businessModelSlug ?? undefined,
        patternHits: f.kgMeta?.patternHits ?? patternHits,
        priorityBoost: (f.kgMeta?.priorityBoost ?? 0) + softBoost,
        industryFitNote,
      },
    };
  });
}

/** Soft priority boost from business-model gaps / stages — does not change OI formula. */
export async function applyBusinessModelSoftScoring(
  findings: MoneyGapFinding[],
  classification: ClassificationResult,
): Promise<MoneyGapFinding[]> {
  await ensureKnowledgeCatalog();
  if (!classification.businessModelSlug) return findings;

  const model = await db.query.kgBusinessModels.findFirst({
    where: eq(kgBusinessModels.slug, classification.businessModelSlug),
  });
  if (!model || !isActiveStatus(model.status) || !model.profile) return findings;

  const profile = model.profile;
  const expectations = [
    ...profile.commonGaps,
    ...profile.growthLevers,
    ...profile.conversionPatterns,
    ...(profile.benchmarks?.expectedCapabilities ?? []),
    ...profile.revenueStages.map((s) => s.label),
  ].map((s) => s.toLowerCase());

  return findings.map((f) => {
    const hay = `${f.title} ${f.whatsMissing} ${f.category} ${f.moduleId}`.toLowerCase();
    const hits = expectations.filter((e) =>
      hay.split(/\s+/).some((w) => e.includes(w) || w.includes(e.split(" ")[0] ?? "")),
    );
    const gapHits = profile.commonGaps.filter((g) => {
      const tokens = g.toLowerCase().replace(/^no |^missing |^weak /g, "").split(/\s+/);
      return tokens.some((t) => t.length > 3 && hay.includes(t));
    });

    const softBoost = Math.min(10, hits.length * 2) + Math.min(8, gapHits.length * 3);
    const businessModelFitNote =
      gapHits.length > 0
        ? `Closes ${model.name} model gap: ${gapHits[0]}`
        : hits.length > 0
          ? `Matches ${model.name} revenue architecture`
          : undefined;

    if (softBoost <= 0) {
      return {
        ...f,
        kgMeta: {
          ...f.kgMeta,
          businessModelSlug: classification.businessModelSlug ?? undefined,
          businessModelFitNote,
        },
      };
    }

    return {
      ...f,
      priorityScore: Math.min(100, (f.priorityScore ?? 50) + softBoost),
      kgMeta: {
        ...f.kgMeta,
        businessModelSlug: classification.businessModelSlug ?? undefined,
        priorityBoost: (f.kgMeta?.priorityBoost ?? 0) + softBoost,
        businessModelFitNote,
      },
    };
  });
}

/** Soft priority boost from matched Growth Pattern Library™ recommendations. */
export async function applyPatternSoftScoring(
  findings: MoneyGapFinding[],
  classification: ClassificationResult,
  recommendations: {
    patternSlug: string;
    name: string;
    confidence: number;
    impactScore: number;
  }[],
): Promise<MoneyGapFinding[]> {
  if (recommendations.length === 0) return findings;

  const top = recommendations.slice(0, 6);
  const patterns = await db.query.kgPatterns.findMany();
  const bySlug = Object.fromEntries(patterns.map((p) => [p.slug, p]));

  return findings.map((f) => {
    const hay =
      `${f.title} ${f.whatsMissing} ${f.summary} ${f.category} ${f.moduleId}`.toLowerCase();
    const hits: string[] = [];
    let softBoost = 0;
    let patternFitNote: string | undefined;

    for (const rec of top) {
      const row = bySlug[rec.patternSlug];
      const keys = [
        rec.patternSlug,
        rec.name,
        ...(row?.relatedEntitySlugs ?? []),
        ...(row?.profile?.requiredConditions ?? []),
      ].map((x) => x.toLowerCase().replace(/_/g, " "));
      const matched = keys.some((k) => k.length > 2 && hay.includes(k));
      if (!matched) continue;
      hits.push(rec.patternSlug);
      softBoost += Math.min(4, Math.round(rec.confidence / 30) + 1);
      if (!patternFitNote) {
        patternFitNote = `Supports recommended pattern: ${rec.name}`;
      }
    }

    softBoost = Math.min(8, softBoost);
    if (softBoost <= 0 && hits.length === 0) {
      return {
        ...f,
        kgMeta: {
          ...f.kgMeta,
          industrySlug: classification.industrySlug ?? undefined,
          businessModelSlug: classification.businessModelSlug ?? undefined,
        },
      };
    }

    return {
      ...f,
      priorityScore:
        softBoost > 0
          ? Math.min(100, (f.priorityScore ?? 50) + softBoost)
          : f.priorityScore,
      kgMeta: {
        ...f.kgMeta,
        industrySlug: classification.industrySlug ?? undefined,
        businessModelSlug: classification.businessModelSlug ?? undefined,
        patternHits: [...new Set([...(f.kgMeta?.patternHits ?? []), ...hits])],
        priorityBoost: (f.kgMeta?.priorityBoost ?? 0) + softBoost,
        patternFitNote,
      },
    };
  });
}
