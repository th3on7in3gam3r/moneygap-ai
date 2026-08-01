import type { GrowthRoadmapItem } from "@/db/schema";
import type {
  GrowthRoadmap,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";
import { EMPTY_ROADMAP } from "@/lib/analysis/engine/types";

function itemFromFinding(
  finding: MoneyGapFinding,
  preferredTier?: "quick_win" | "medium" | "long_term",
): GrowthRoadmapItem {
  const fix =
    (preferredTier
      ? finding.fixes.find((f) => f.tier === preferredTier)
      : undefined) ??
    finding.fixes.find((f) => f.tier === "quick_win") ??
    finding.fixes[0];

  return {
    title: finding.title,
    action: fix?.action ?? finding.whatsMissing,
    expectedOutcome: fix?.expectedImpact ?? finding.businessImpact,
    difficulty: fix?.difficulty ?? finding.difficulty,
    businessImpact: finding.businessImpact,
    opportunityId: null,
  };
}

/**
 * Build Growth Roadmap buckets from prioritized findings.
 * Today = top quick wins; Week = high-index medium; Month = remaining high;
 * Next Quarter = long-term / lower urgency.
 */
export function buildGrowthRoadmap(
  findings: MoneyGapFinding[],
): GrowthRoadmap {
  if (findings.length === 0) return { ...EMPTY_ROADMAP };

  const sorted = [...findings].sort(
    (a, b) => b.opportunityIndex - a.opportunityIndex,
  );

  const used = new Set<string>();
  const take = (
    predicate: (f: MoneyGapFinding) => boolean,
    limit: number,
    tier?: "quick_win" | "medium" | "long_term",
  ): GrowthRoadmapItem[] => {
    const out: GrowthRoadmapItem[] = [];
    for (const f of sorted) {
      const key = `${f.moduleId}:${f.title}`;
      if (used.has(key) || !predicate(f)) continue;
      used.add(key);
      out.push(itemFromFinding(f, tier));
      if (out.length >= limit) break;
    }
    return out;
  };

  const today = take(
    (f) =>
      f.fixes.some((x) => x.tier === "quick_win") ||
      f.difficulty.toLowerCase().includes("easy"),
    3,
    "quick_win",
  );

  const thisWeek = take(
    (f) => f.opportunityIndex >= 60 || f.severity === "critical" || f.severity === "high",
    4,
    "medium",
  );

  const thisMonth = take(
    (f) => f.opportunityIndex >= 40 || f.severity !== "low",
    5,
    "medium",
  );

  const nextQuarter = take(
    (f) =>
      f.fixes.some((x) => x.tier === "long_term") ||
      f.difficulty.toLowerCase().includes("hard") ||
      true,
    5,
    "long_term",
  );

  return { today, thisWeek, thisMonth, nextQuarter };
}
