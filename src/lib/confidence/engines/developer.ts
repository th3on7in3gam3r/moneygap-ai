import type { ConfidenceEnrichContext } from "@/lib/confidence/types";
import { clampScore } from "@/lib/confidence/types";

/** Developer Confidence™ — Project Memory / stack readiness */
export function scoreDeveloperConfidence(ctx: ConfidenceEnrichContext): number {
  if (!ctx.hasTechProfile || !ctx.techProfile) {
    return 35; // soft-low when no Project Memory
  }
  const s = ctx.techProfile;
  let score = 45;
  if (s.frontend) score += 12;
  if (s.backend) score += 8;
  if (s.orm || s.database) score += 8;
  if (s.auth) score += 6;
  if (s.hosting) score += 6;
  if (s.confidence >= 70) score += 10;
  else if (s.confidence >= 40) score += 5;
  return clampScore(score);
}
