import type { PredictionHorizon } from "@/db/schema";

/**
 * Prediction confidence (Phase 20) — distinct from Confidence Center™ (Phase 16).
 */
export function scorePredictionConfidence(input: {
  evidenceCount: number;
  snapshotCount: number;
  softFailNotes: number;
  horizon: PredictionHorizon;
}): number {
  let score = 42;
  score += Math.min(25, input.evidenceCount * 5);
  score += Math.min(20, input.snapshotCount * 4);
  score -= Math.min(18, input.softFailNotes * 4);
  if (input.horizon === "90d") score -= 6;
  if (input.horizon === "7d") score += 4;
  return Math.max(15, Math.min(92, Math.round(score)));
}
