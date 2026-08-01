export {
  CONFIDENCE_INTEL_VERSION,
  type ConfidenceEnrichContext,
  type FindingLike,
} from "@/lib/confidence/types";
export { enrichOpportunityConfidence, isConfidenceIntelEnabled } from "@/lib/confidence/enrich";
export { blendOverallConfidence } from "@/lib/confidence/overall";
export { computeRisk } from "@/lib/confidence/risk";
export { computeImpact } from "@/lib/confidence/impact";
export { buildExplainability } from "@/lib/confidence/explain";
export { buildValidationChecklist } from "@/lib/confidence/validation";
export {
  createConfidenceSnapshot,
  listConfidenceSnapshots,
  getLatestConfidenceSnapshot,
} from "@/lib/confidence/snapshots";
export {
  getConfidenceOverview,
  listConfidenceRecommendations,
  refreshConfidenceSnapshot,
} from "@/lib/confidence/service";
export { scoreBusinessConfidence } from "@/lib/confidence/engines/business";
export { scoreDeveloperConfidence } from "@/lib/confidence/engines/developer";
export { scoreDataConfidence } from "@/lib/confidence/engines/data";
export { scoreBenchmarkConfidence } from "@/lib/confidence/engines/benchmark";
export { scoreAiConfidence } from "@/lib/confidence/engines/ai";
