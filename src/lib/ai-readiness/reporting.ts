import type {
  AiReadinessRecommendation,
  LlmsValidationResult,
} from "./types";

/** Flatten validation + score recommendations for reporters / UI. */
export function collectRecommendations(
  validation: LlmsValidationResult | null,
  extras: AiReadinessRecommendation[] = [],
): AiReadinessRecommendation[] {
  const fromVal = validation?.recommendations ?? [];
  const map = new Map<string, AiReadinessRecommendation>();
  for (const r of [...fromVal, ...extras]) {
    const key = r.ruleId ?? r.title;
    if (!map.has(key)) map.set(key, r);
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return [...map.values()].sort(
    (a, b) => order[a.priority] - order[b.priority],
  );
}
