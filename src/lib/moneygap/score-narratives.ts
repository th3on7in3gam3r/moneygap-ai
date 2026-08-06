import {
  GOLDEN_CATEGORIES,
  goldenCategoryFullLabel,
  moduleToGoldenCategory,
  rollupCategoryScores,
  type GoldenCategoryId,
} from "@/lib/moneygap/categories";
import type { CategoryScores } from "@/db/schema";

export type CategoryNarrative = {
  categoryId: GoldenCategoryId;
  label: string;
  score: number;
  currentState: string;
  weaknesses: string;
  improvements: string;
};

type OppLike = {
  title: string;
  moduleId?: string | null;
  whatsMissing?: string | null;
  summary?: string | null;
};

function bandCopy(score: number, label: string): string {
  if (score >= 75) {
    return `${label} shows substantial missing opportunity (score ${score}/100).`;
  }
  if (score >= 45) {
    return `${label} has moderate gaps worth prioritizing (score ${score}/100).`;
  }
  if (score >= 20) {
    return `${label} is relatively stronger, with a few clear improvements (score ${score}/100).`;
  }
  return `${label} looks comparatively healthy on this scan (score ${score}/100).`;
}

/** Derive current / weaknesses / improvements per golden category (presentation only). */
export function buildCategoryNarratives(
  scores: CategoryScores | null | undefined,
  opportunities: OppLike[] = [],
): CategoryNarrative[] {
  const golden = rollupCategoryScores(scores);

  return GOLDEN_CATEGORIES.map((cat) => {
    const score = golden[cat.id] ?? 0;
    const gaps = opportunities
      .filter((o) => moduleToGoldenCategory(o.moduleId) === cat.id)
      .slice(0, 3);

    const weaknessTitles = gaps.map((g) => g.title).filter(Boolean);
    const improveHints = gaps
      .map((g) => g.whatsMissing ?? g.summary)
      .filter((s): s is string => Boolean(s && s.trim()))
      .slice(0, 2);

    return {
      categoryId: cat.id,
      label: goldenCategoryFullLabel(cat.id),
      score,
      currentState: bandCopy(score, cat.shortLabel),
      weaknesses:
        weaknessTitles.length > 0
          ? `Top gaps: ${weaknessTitles.join("; ")}.`
          : score >= 45
            ? `No titled gaps mapped here yet — module signals still show room to improve ${cat.shortLabel.toLowerCase()}.`
            : `No major ${cat.shortLabel.toLowerCase()} gaps surfaced on this report.`,
      improvements:
        improveHints.length > 0
          ? improveHints.map((h) => h.replace(/\s+/g, " ").trim()).join(" ")
          : `Tighten ${cat.shortLabel.toLowerCase()} signals: ${cat.description}`,
    };
  });
}
