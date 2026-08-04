import type { GrowthBadgeStyle } from "@/db/schema";

export const BADGE_STYLES: {
  id: GrowthBadgeStyle;
  label: string;
  shortLabel: string;
}[] = [
  {
    id: "growth_optimized",
    label: "Growth Optimized by MoneyGap AI™",
    shortLabel: "Growth Optimized",
  },
  {
    id: "analyzed_improved",
    label: "Analyzed & Improved with MoneyGap AI™",
    shortLabel: "Analyzed & Improved",
  },
  {
    id: "growth_intelligence",
    label: "Website Growth Intelligence by MoneyGap AI™",
    shortLabel: "Growth Intelligence",
  },
];

export function badgeStyleLabel(style: GrowthBadgeStyle): string {
  return BADGE_STYLES.find((s) => s.id === style)?.label ?? style;
}

export const BADGE_SVG_THEME = {
  bg: "#0f1c2e",
  fg: "#f8fafc",
  muted: "#94a3b8",
  accent: "#0d9488",
  accentSoft: "#16324f",
  border: "#2a3f55",
};
