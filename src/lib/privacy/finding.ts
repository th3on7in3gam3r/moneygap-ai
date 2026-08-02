import type { PrivacyFinding } from "./types";

export function privacyFinding(
  partial: Omit<PrivacyFinding, "category" | "estimateLabeled"> & {
    estimateLabeled?: string;
  },
): PrivacyFinding {
  return {
    category: "privacy",
    estimateLabeled: partial.estimateLabeled ?? "AI Estimate",
    ...partial,
  };
}
