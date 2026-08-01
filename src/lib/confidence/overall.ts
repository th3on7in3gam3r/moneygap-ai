import { clampScore } from "@/lib/confidence/types";

export type EngineScores = {
  business: number;
  developer: number;
  data: number;
  benchmark: number;
  ai: number;
};

/** Weighted blend — does not change Opportunity Index™ */
export function blendOverallConfidence(engines: EngineScores): number {
  return clampScore(
    engines.business * 0.22 +
      engines.developer * 0.15 +
      engines.data * 0.23 +
      engines.benchmark * 0.18 +
      engines.ai * 0.22,
  );
}
