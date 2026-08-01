import type { ConfidenceIntelJson } from "@/db/schema";
import { scoreAiConfidence } from "@/lib/confidence/engines/ai";
import { scoreBenchmarkConfidence } from "@/lib/confidence/engines/benchmark";
import { scoreBusinessConfidence } from "@/lib/confidence/engines/business";
import { scoreDataConfidence } from "@/lib/confidence/engines/data";
import { scoreDeveloperConfidence } from "@/lib/confidence/engines/developer";
import { buildExplainability } from "@/lib/confidence/explain";
import { computeImpact } from "@/lib/confidence/impact";
import { blendOverallConfidence } from "@/lib/confidence/overall";
import { computeRisk } from "@/lib/confidence/risk";
import {
  CONFIDENCE_INTEL_VERSION,
  type ConfidenceEnrichContext,
  type FindingLike,
} from "@/lib/confidence/types";
import { buildValidationChecklist } from "@/lib/confidence/validation";

export function isConfidenceIntelEnabled(): boolean {
  const v = process.env.FEATURE_CONFIDENCE_INTEL;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}

export function enrichOpportunityConfidence(
  finding: FindingLike,
  ctx: ConfidenceEnrichContext = {},
): ConfidenceIntelJson {
  const engines = {
    business: scoreBusinessConfidence(finding),
    developer: scoreDeveloperConfidence(ctx),
    data: scoreDataConfidence(finding, ctx),
    benchmark: scoreBenchmarkConfidence(finding),
    ai: scoreAiConfidence(finding),
  };
  const overall = blendOverallConfidence(engines);
  const risk = computeRisk(finding, ctx);
  const impact = computeImpact(finding);
  const explainability = buildExplainability(finding);
  const validationChecklist = buildValidationChecklist(finding, risk);

  return {
    version: CONFIDENCE_INTEL_VERSION,
    overall,
    engines,
    risk,
    impact,
    explainability,
    validationChecklist,
  };
}
