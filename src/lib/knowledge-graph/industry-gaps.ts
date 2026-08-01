import { eq } from "drizzle-orm";
import { db } from "@/db";
import type { IndustryGapSnapshot, KgIndustryProfile } from "@/db/schema";
import { kgIndustries } from "@/db/schema";
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

function moduleForLabel(label: string): string | undefined {
  const l = label.toLowerCase();
  if (/(trial|demo|checkout|quote|book|cta|cart|donate|giv)/.test(l)) return "conversion";
  if (/(review|case study|logo|testimonial|trust|security)/.test(l)) return "trust";
  if (/(seo|schema|gbp|page)/.test(l)) return "seo";
  if (/(newsletter|email|social|campaign)/.test(l)) return "marketing";
  if (/(pricing|membership|product|revenue)/.test(l)) return "revenue";
  if (/(sermon|content|blog|guide)/.test(l)) return "content";
  return undefined;
}

export async function buildIndustryGapSnapshot(input: {
  classification: ClassificationResult;
  intelligence: IntelligenceResult;
  corpus: string;
  findings: MoneyGapFinding[];
  /** Optional persisted opportunity ids keyed by title for UI links */
  opportunityIdsByTitle?: Record<string, string>;
}): Promise<IndustryGapSnapshot | null> {
  await ensureKnowledgeCatalog();
  const { classification } = input;
  if (!classification.industrySlug) return null;

  const industry = await db.query.kgIndustries.findFirst({
    where: eq(kgIndustries.slug, classification.industrySlug),
  });
  if (!industry) return null;

  const profile: KgIndustryProfile = industry.profile;
  const hay = [
    input.corpus.slice(0, 50000),
    JSON.stringify(input.intelligence),
    ...input.findings.map((f) => `${f.title} ${f.whatsMissing} ${f.summary}`),
  ]
    .join(" ")
    .toLowerCase();

  const expected = [
    ...(profile.benchmarks?.expectedFeatures ?? profile.websiteFeatures),
  ];
  const missingCapabilities = expected
    .filter((feat) => !featurePresent(feat, hay))
    .map((label) => ({
      label,
      evidence: `Not clearly detected vs ${industry.name} peer expectations.`,
      moduleId: moduleForLabel(label),
    }))
    .slice(0, 8);

  const commonGapHits = (profile.commonGaps ?? []).filter((g) => {
    // If corpus doesn't mention the gap topic as present capability, treat as relevant
    const tokens = g.toLowerCase().replace(/^no |^missing |^weak /g, "").split(/\s+/);
    return !tokens.every((t) => t.length > 3 && hay.includes(t));
  });

  for (const g of commonGapHits.slice(0, 4)) {
    if (!missingCapabilities.some((m) => m.label.toLowerCase() === g.toLowerCase())) {
      missingCapabilities.push({
        label: g,
        evidence: "Common industry gap pattern.",
        moduleId: moduleForLabel(g),
      });
    }
  }

  const competitorPatterns = [
    ...(profile.conversionPatterns ?? []).map((p) => `Peers convert via: ${p}`),
    ...(profile.seoExpectations ?? []).map((p) => `Peers invest in SEO: ${p}`),
    ...(profile.marketingChannels ?? []).slice(0, 3).map((p) => `Peers acquire via: ${p}`),
  ].slice(0, 8);

  const gapHay = missingCapabilities.map((m) => m.label.toLowerCase()).join(" ");
  const priorityOpportunities = [...input.findings]
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
    .filter((f) => {
      const t = `${f.title} ${f.whatsMissing}`.toLowerCase();
      return (
        gapHay.length > 0 &&
        gapHay.split(/\s+/).some((w) => w.length > 4 && t.includes(w))
      );
    })
    .slice(0, 5)
    .map((f) => ({
      title: f.title,
      opportunityId: input.opportunityIdsByTitle?.[f.title],
      reason: `Addresses ${industry.name} expectation gaps.`,
    }));

  // If no title match, still surface top findings as industry priorities
  if (priorityOpportunities.length === 0) {
    for (const f of [...input.findings]
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
      .slice(0, 3)) {
      priorityOpportunities.push({
        title: f.title,
        opportunityId: input.opportunityIdsByTitle?.[f.title],
        reason: `High-impact opportunity for ${industry.name}.`,
      });
    }
  }

  const expectedCount = Math.max(1, expected.length);
  const presentCount = expectedCount - missingCapabilities.filter((m) =>
    expected.some((e) => e.toLowerCase() === m.label.toLowerCase()),
  ).length;
  const industryFitScore = Math.max(
    15,
    Math.min(95, Math.round((presentCount / expectedCount) * 100) - missingCapabilities.length * 2),
  );

  const benchmarkSummary =
    profile.benchmarks?.notes ??
    profile.description ??
    `${industry.name} peers typically emphasize ${profile.growthPriorities.slice(0, 3).join(", ")}.`;

  return {
    industrySlug: industry.slug,
    industryName: industry.name,
    confidence: classification.confidence,
    source: classification.source,
    benchmarkSummary,
    missingCapabilities: missingCapabilities.slice(0, 10),
    competitorPatterns,
    priorityOpportunities,
    industryFitScore,
  };
}
