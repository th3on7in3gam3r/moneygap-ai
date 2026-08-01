import type { FindingLike, ConfidenceEnrichContext } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** Data Confidence™ — Trust data completeness + detection */
export function scoreDataConfidence(
  f: FindingLike,
  ctx: ConfidenceEnrichContext,
): number {
  const fromTrust = f.trustMeta?.factors?.dataCompleteness;
  const detection = f.trustMeta?.factors?.detectionQuality;
  if (typeof fromTrust === "number" && typeof detection === "number") {
    return clampScore(fromTrust * 0.55 + detection * 0.45);
  }
  let score = 40;
  if (f.evidenceSummary) score += 15;
  if ((f.supportingSignals?.length ?? 0) > 0) score += 12;
  if (f.detectionStatus === "not_found") score += 15;
  else if (f.detectionStatus === "partial") score += 8;
  if (ctx.corpusChars && ctx.corpusChars > 2000) score += 12;
  else if (ctx.corpusChars && ctx.corpusChars > 500) score += 6;
  return clampScore(score);
}
