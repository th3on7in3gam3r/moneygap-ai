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
  bg: "#0c1210",
  fg: "#f4f7f5",
  muted: "#a7b5ad",
  accent: "#3d9b6e",
  accentSoft: "#1a2e24",
  border: "#2a3d34",
};
