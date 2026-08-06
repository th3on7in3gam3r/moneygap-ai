import type { GrowthBadgeStyle } from "@/db/schema";

export const BADGE_STYLES: {
  id: GrowthBadgeStyle;
  label: string;
  shortLabel: string;
  /** One-line hint shown under the radio option */
  hint: string;
  /** Accent used on the score chip / stroke for this style */
  accent: string;
}[] = [
  {
    id: "growth_optimized",
    label: "Growth Optimized by MoneyGap AI™",
    shortLabel: "Growth Optimized",
    hint: "Best for sites that have closed gaps and want an “optimized” claim.",
    accent: "#0d9488",
  },
  {
    id: "analyzed_improved",
    label: "Analyzed & Improved with MoneyGap AI™",
    shortLabel: "Analyzed & Improved",
    hint: "Best for before/after journeys — emphasizes analysis + improvement.",
    accent: "#2563eb",
  },
  {
    id: "growth_intelligence",
    label: "Website Growth Intelligence by MoneyGap AI™",
    shortLabel: "Growth Intelligence",
    hint: "Best for thought-leadership / intelligence positioning.",
    accent: "#7c3aed",
  },
];

export function badgeStyleLabel(style: GrowthBadgeStyle): string {
  return BADGE_STYLES.find((s) => s.id === style)?.label ?? style;
}

export function badgeStyleMeta(style: GrowthBadgeStyle) {
  return (
    BADGE_STYLES.find((s) => s.id === style) ?? {
      id: style,
      label: style,
      shortLabel: style,
      hint: "",
      accent: "#0d9488",
    }
  );
}

export const BADGE_SVG_THEME = {
  bg: "#0f1c2e",
  fg: "#f8fafc",
  muted: "#94a3b8",
  accent: "#0d9488",
  accentSoft: "#16324f",
  border: "#2a3f55",
};
