/** Wire format from the MoneyGap browser extension (subset validated server-side). */

export type ExtensionReportScores = {
  overall: number;
  revenue?: number;
  seo?: number;
  aeo?: number;
  trust?: number;
  conversion?: number;
  /** AI Readiness health score (higher = better); optional wire field */
  aiReadiness?: number;
};

export type ExtensionFixPathItem = {
  id: string;
  title: string;
  whyItMatters?: string;
  recommendation?: string;
  category?: string;
  priority?: string;
  growthEffect?: string;
  impact?: string;
};

export type ExtensionMoneyGapReport = {
  id: string;
  shareId?: string;
  analysis: { url: string };
  scores: ExtensionReportScores;
  fixPath?: ExtensionFixPathItem[];
  recommendations?: Array<{
    id: string;
    title: string;
    reason?: string;
    recommendation?: string;
    whyItMatters?: string;
    growthEffect?: string;
    category?: string;
    impact?: string;
  }>;
  createdAt?: string;
  provider?: string;
  engine?: string;
};

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 200);
  }
}

export function isValidExtensionReport(
  value: unknown,
): value is ExtensionMoneyGapReport {
  if (!value || typeof value !== "object") return false;
  const r = value as ExtensionMoneyGapReport;
  if (typeof r.id !== "string" || r.id.length < 4 || r.id.length > 120) {
    return false;
  }
  if (!r.analysis || typeof r.analysis.url !== "string" || !r.analysis.url) {
    return false;
  }
  if (
    !r.scores ||
    typeof r.scores.overall !== "number" ||
    !Number.isFinite(r.scores.overall)
  ) {
    return false;
  }
  return true;
}
