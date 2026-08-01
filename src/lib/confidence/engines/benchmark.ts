import type { FindingLike } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** Benchmark Confidence™ — industry / BM / pattern KG context */
export function scoreBenchmarkConfidence(f: FindingLike): number {
  const kg = f.kgMeta;
  if (!kg) return 45;
  let score = 48;
  if (kg.industrySlug) score += 12;
  if (kg.industryFitNote) score += 8;
  if (kg.businessModelSlug) score += 8;
  if ((kg.ruleHits?.length ?? 0) > 0) score += 10;
  if ((kg.patternHits?.length ?? 0) > 0) score += 10;
  if (kg.patternFitNote) score += 6;
  if (typeof kg.priorityBoost === "number" && kg.priorityBoost > 0) score += 5;
  return clampScore(score);
}
