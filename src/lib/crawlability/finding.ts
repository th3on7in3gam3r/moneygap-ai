import type { CrawlabilityFinding, CrawlabilityPriority } from "./types";

export function crawlFinding(
  partial: Omit<CrawlabilityFinding, "category" | "estimateLabeled"> & {
    estimateLabeled?: string;
  },
): CrawlabilityFinding {
  return {
    category: "crawlability",
    estimateLabeled: partial.estimateLabeled ?? "AI Estimate",
    ...partial,
  };
}

export function priorityFromSeverity(
  severity: CrawlabilityPriority,
): CrawlabilityPriority {
  return severity;
}
