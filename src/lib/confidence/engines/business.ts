import type { FindingLike } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** Business Confidence™ — BM fit + reasoning quality */
export function scoreBusinessConfidence(f: FindingLike): number {
  let score = 50;
  if (f.businessReasoning && f.businessReasoning.length > 40) score += 15;
  if (f.kgMeta?.businessModelSlug) score += 12;
  if (f.kgMeta?.businessModelFitNote) score += 10;
  if (f.whyItMatters && f.whyItMatters.length > 30) score += 8;
  if (f.category) score += 5;
  return clampScore(score);
}
