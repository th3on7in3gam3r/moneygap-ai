import type { PrivacyStatus } from "./types";

export function privacyStatus(score: number | null): PrivacyStatus | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

export function privacyStatusTone(
  status: PrivacyStatus | null,
): "accent" | "gap" | "danger" | "muted" {
  if (!status) return "muted";
  if (status === "Excellent" || status === "Good") return "accent";
  if (status === "Needs Attention") return "gap";
  return "danger";
}
