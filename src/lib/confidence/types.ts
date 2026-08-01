import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { KgMetaJson, TechStackProfile, TrustMetaJson } from "@/db/schema";

export const CONFIDENCE_INTEL_VERSION = "1.0.0";

export type ConfidenceEnrichContext = {
  corpusChars?: number;
  hasTechProfile?: boolean;
  techProfile?: TechStackProfile | null;
};

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type FindingLike = Pick<
  MoneyGapFinding,
  | "title"
  | "category"
  | "moduleId"
  | "detectionStatus"
  | "confidence"
  | "confidenceLevel"
  | "evidenceSummary"
  | "supportingSignals"
  | "businessReasoning"
  | "detectionSource"
  | "difficulty"
  | "severity"
  | "estimatedAnnualRevenue"
  | "estimatedLeads"
  | "estimatedTraffic"
  | "estimatedConversionLift"
  | "businessImpact"
  | "whatsMissing"
  | "whyItMatters"
  | "expectedRoi"
  | "fixes"
> & {
  trustMeta?: TrustMetaJson | null;
  kgMeta?: KgMetaJson | null;
};
