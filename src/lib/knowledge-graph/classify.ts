import type { ModelEvidenceItem } from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import {
  CORPUS_INDUSTRY_CUES,
  CORPUS_MODEL_CUES,
  INDUSTRY_KEYWORDS,
  MODEL_KEYWORDS,
  type BusinessModelSlug,
  type IndustrySlug,
} from "@/lib/knowledge-graph/taxonomy";

export type ClassificationSource = "auto" | "override";

export type ClassificationResult = {
  industrySlug: IndustrySlug | null;
  businessModelSlug: BusinessModelSlug | null;
  confidence: number;
  signals: string[];
  source: ClassificationSource;
  modelEvidence: ModelEvidenceItem[];
};

export type ClassificationOverride = {
  industrySlug?: IndustrySlug | null;
  businessModelSlug?: BusinessModelSlug | null;
};

function scoreKeywords(hay: string, keywords: string[]): { score: number; hits: string[] } {
  const hits: string[] = [];
  let score = 0;
  for (const k of keywords) {
    if (hay.includes(k.toLowerCase())) {
      hits.push(k);
      score += k.length > 6 ? 12 : 8;
    }
  }
  return { score, hits };
}

function buildHaystack(intelligence: IntelligenceResult, corpus?: string): string {
  const b = intelligence.business;
  return [
    b.industry,
    b.businessType,
    b.companyType,
    b.businessModel,
    b.revenueModel,
    b.targetMarket,
    intelligence.overview,
    ...(b.productsServices ?? []),
    corpus?.slice(0, 20000) ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function classifyBusiness(
  intelligence: IntelligenceResult,
  options?: { corpus?: string; override?: ClassificationOverride | null },
): ClassificationResult {
  if (options?.override?.industrySlug || options?.override?.businessModelSlug) {
    const hasIndustry = Boolean(options.override.industrySlug);
    const hasModel = Boolean(options.override.businessModelSlug);
    // Full override when either field set from user — merge with auto for missing half
    const auto =
      !hasIndustry || !hasModel
        ? classifyBusiness(intelligence, {
            corpus: options.corpus,
            override: null,
          })
        : null;
    return {
      industrySlug: options.override.industrySlug ?? auto?.industrySlug ?? null,
      businessModelSlug:
        options.override.businessModelSlug ?? auto?.businessModelSlug ?? null,
      confidence: 100,
      signals: ["source:override"],
      source: "override",
      modelEvidence: options.override.businessModelSlug
        ? [{ signal: "user_override", weight: 100 }]
        : (auto?.modelEvidence ?? []),
    };
  }

  const hay = buildHaystack(intelligence, options?.corpus);
  let bestIndustry: IndustrySlug | null = null;
  let bestIndustryScore = 0;
  const signals: string[] = [];

  for (const [slug, keywords] of Object.entries(INDUSTRY_KEYWORDS) as [
    IndustrySlug,
    string[],
  ][]) {
    const { score, hits } = scoreKeywords(hay, keywords);
    let total = score;
    const cueHits: string[] = [];
    for (const cue of CORPUS_INDUSTRY_CUES[slug] ?? []) {
      if (hay.includes(cue.toLowerCase())) {
        total += 6;
        cueHits.push(cue);
      }
    }
    if (total > bestIndustryScore) {
      bestIndustryScore = total;
      bestIndustry = slug;
      signals.length = 0;
      signals.push(...hits.map((h) => `industry:${h}`));
      signals.push(...cueHits.map((h) => `corpus:${h}`));
    }
  }

  let bestModel: BusinessModelSlug | null = null;
  let bestModelScore = 0;
  const modelEvidence: ModelEvidenceItem[] = [];

  for (const [slug, keywords] of Object.entries(MODEL_KEYWORDS) as [
    BusinessModelSlug,
    string[],
  ][]) {
    const { score, hits } = scoreKeywords(hay, keywords);
    let total = score;
    const evidence: ModelEvidenceItem[] = hits.map((h) => ({
      signal: `keyword:${h}`,
      weight: h.length > 6 ? 12 : 8,
    }));
    for (const cue of CORPUS_MODEL_CUES[slug] ?? []) {
      if (hay.includes(cue.toLowerCase())) {
        total += 10;
        evidence.push({ signal: `corpus:${cue}`, weight: 10 });
      }
    }
    if (total > bestModelScore) {
      bestModelScore = total;
      bestModel = slug;
      modelEvidence.length = 0;
      modelEvidence.push(...evidence);
      signals.push(...hits.map((h) => `model:${h}`));
    }
  }

  if (!bestModel && bestIndustry === "saas") bestModel = "subscription";
  if (!bestModel && bestIndustry === "ecommerce") bestModel = "product_commerce";
  if (!bestModel && bestIndustry === "nonprofits") bestModel = "nonprofit";
  if (!bestModel && bestIndustry === "churches") bestModel = "nonprofit";
  if (!bestModel && bestIndustry === "creator_economy") bestModel = "digital_products";
  if (!bestModel && (bestIndustry === "restaurants" || bestIndustry === "local_services")) {
    bestModel = "local_business";
  }
  if (!bestModel && bestIndustry === "professional_services") bestModel = "lead_generation";

  if (bestModel && modelEvidence.length === 0) {
    modelEvidence.push({ signal: `heuristic:${bestIndustry ?? "unknown"}`, weight: 5 });
  }

  const confidence = Math.min(
    95,
    40 + Math.min(40, bestIndustryScore) + Math.min(20, bestModelScore),
  );

  return {
    industrySlug: bestIndustry,
    businessModelSlug: bestModel,
    confidence: bestIndustryScore >= 8 ? confidence : Math.max(30, confidence - 20),
    signals: [...new Set(signals)].slice(0, 16),
    source: "auto",
    modelEvidence: modelEvidence.slice(0, 12),
  };
}

export function isIndustrySlug(value: string): value is IndustrySlug {
  return value in INDUSTRY_KEYWORDS;
}

export function isBusinessModelSlug(value: string): value is BusinessModelSlug {
  return value in MODEL_KEYWORDS;
}
