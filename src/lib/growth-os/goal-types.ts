import type { BusinessGoalType } from "@/db/schema";

export const GOAL_TYPES: { id: BusinessGoalType; label: string }[] = [
  { id: "leads", label: "Increase leads" },
  { id: "revenue", label: "Increase revenue" },
  { id: "product", label: "Launch product" },
  { id: "subscribers", label: "Grow subscribers" },
  { id: "seo", label: "Improve SEO" },
  { id: "authority", label: "Build authority" },
  { id: "conversions", label: "Improve conversions" },
  { id: "custom", label: "Custom" },
];

/** Map goal types to opportunity category / module hints. */
export const GOAL_CATEGORY_HINTS: Record<BusinessGoalType, string[]> = {
  leads: ["lead", "magnet", "capture", "form", "cta", "marketing"],
  revenue: ["pricing", "monetization", "product", "offer", "checkout"],
  product: ["product", "digital", "course", "membership"],
  subscribers: ["newsletter", "email", "subscribe", "list"],
  seo: ["seo", "content", "search", "blog"],
  authority: ["authority", "backlink", "guest", "trust", "testimonial"],
  conversions: ["conversion", "funnel", "checkout", "cta", "landing"],
  custom: [],
};

export function goalAlignmentScore(
  goalTypes: BusinessGoalType[],
  opportunity: { title: string; category: string; moduleId?: string | null },
): number {
  if (goalTypes.length === 0) return 0;
  const hay = `${opportunity.title} ${opportunity.category} ${opportunity.moduleId ?? ""}`.toLowerCase();
  let best = 0;
  for (const t of goalTypes) {
    const hints = GOAL_CATEGORY_HINTS[t] ?? [];
    const hits = hints.filter((h) => hay.includes(h)).length;
    best = Math.max(best, hits > 0 ? 20 + hits * 10 : 0);
  }
  return Math.min(40, best);
}
