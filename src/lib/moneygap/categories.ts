import type { CategoryScores } from "@/db/schema";
import type { ModuleId } from "@/lib/analysis/engine/types";

/** Customer-facing MoneyGap Categories™ (Golden Master v2). */
export const GOLDEN_CATEGORY_IDS = [
  "revenue",
  "offer",
  "conversion",
  "trust",
  "content",
  "ai_visibility",
  "technical",
] as const;

export type GoldenCategoryId = (typeof GOLDEN_CATEGORY_IDS)[number];

export type GoldenCategoryDef = {
  id: GoldenCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  /** Engine moduleIds that roll into this category. */
  modules: ModuleId[];
};

export const GOLDEN_CATEGORIES: GoldenCategoryDef[] = [
  {
    id: "revenue",
    label: "Revenue Gap Intelligence™",
    shortLabel: "Revenue",
    description: "Missed monetization, services, and recurring revenue.",
    modules: ["revenue"],
  },
  {
    id: "offer",
    label: "Offer Gap Intelligence™",
    shortLabel: "Offer",
    description: "Pricing, packages, tiers, and buying options.",
    modules: ["marketing"],
  },
  {
    id: "conversion",
    label: "Conversion Gap Intelligence™",
    shortLabel: "Conversion",
    description: "CTAs, journeys, and paths from visitor to customer.",
    modules: ["conversion", "automation"],
  },
  {
    id: "trust",
    label: "Trust Gap Intelligence™",
    shortLabel: "Trust",
    description: "Proof, authority, and credibility signals.",
    modules: ["trust", "authority", "customer"],
  },
  {
    id: "content",
    label: "Content Gap Intelligence™",
    shortLabel: "Content",
    description: "Educational and traffic-attracting content.",
    modules: ["content"],
  },
  {
    id: "ai_visibility",
    label: "AI Visibility Gap Intelligence™",
    shortLabel: "AI Visibility",
    description: "Schema, entities, and AI-discovery readiness.",
    modules: ["ai"],
  },
  {
    id: "technical",
    label: "Technical Gap Intelligence™",
    shortLabel: "Technical",
    description: "SEO fundamentals, indexing, and competitive tech barriers.",
    modules: ["seo", "competitive"],
  },
];

const MODULE_TO_GOLDEN: Record<ModuleId, GoldenCategoryId> = {
  revenue: "revenue",
  marketing: "offer",
  conversion: "conversion",
  automation: "conversion",
  trust: "trust",
  authority: "trust",
  customer: "trust",
  content: "content",
  ai: "ai_visibility",
  seo: "technical",
  competitive: "technical",
};

export function moduleToGoldenCategory(
  moduleId: string | null | undefined,
): GoldenCategoryId {
  if (moduleId && moduleId in MODULE_TO_GOLDEN) {
    return MODULE_TO_GOLDEN[moduleId as ModuleId];
  }
  return "technical";
}

export function goldenCategoryLabel(id: GoldenCategoryId): string {
  return (
    GOLDEN_CATEGORIES.find((c) => c.id === id)?.shortLabel ?? id
  );
}

export function goldenCategoryFullLabel(id: GoldenCategoryId): string {
  return GOLDEN_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type GoldenScoreMap = Record<GoldenCategoryId, number>;

/** Average constituent module scores (0–100) per golden category. */
export function rollupCategoryScores(
  scores: CategoryScores | null | undefined,
): GoldenScoreMap {
  const out = {} as GoldenScoreMap;
  for (const cat of GOLDEN_CATEGORIES) {
    const values = cat.modules
      .map((m) => scores?.[m])
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    if (values.length === 0) {
      out[cat.id] = 0;
      continue;
    }
    out[cat.id] = Math.round(
      values.reduce((s, n) => s + Math.max(0, Math.min(100, n)), 0) /
        values.length,
    );
  }
  return out;
}

export type GoldenCountMap = Record<GoldenCategoryId, number>;

/** Count findings by mapped golden category (via moduleId). */
export function countByGoldenCategory(
  findings: { moduleId?: string | null }[],
): GoldenCountMap {
  const out = Object.fromEntries(
    GOLDEN_CATEGORY_IDS.map((id) => [id, 0]),
  ) as GoldenCountMap;
  for (const f of findings) {
    const id = moduleToGoldenCategory(f.moduleId);
    out[id] += 1;
  }
  return out;
}
