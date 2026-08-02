import type { CrawlabilityStatus } from "./types";

/** Status bands for Crawlability Score™ (higher = healthier). */
export function crawlabilityStatus(score: number | null): CrawlabilityStatus | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

export function statusTone(
  status: CrawlabilityStatus | null,
): "accent" | "gap" | "danger" | "muted" {
  if (!status) return "muted";
  if (status === "Excellent" || status === "Good") return "accent";
  if (status === "Needs Attention") return "gap";
  return "danger";
}
