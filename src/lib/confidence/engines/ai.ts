import type { FindingLike } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** AI Confidence™ — model certainty minus QA penalties */
export function scoreAiConfidence(f: FindingLike): number {
  const fromTrust = f.trustMeta?.factors?.aiCertainty;
  let score =
    typeof fromTrust === "number"
      ? fromTrust
      : Math.max(0, Math.min(100, f.confidence ?? 50));
  const flags = f.trustMeta?.qaFlags ?? [];
  if (flags.includes("synthesized_evidence")) score -= 12;
  if (flags.includes("missing_fixes")) score -= 10;
  if (flags.length > 2) score -= 8;
  return clampScore(score);
}
