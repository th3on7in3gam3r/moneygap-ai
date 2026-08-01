import type { SelfOptScoreBreakdown } from "@/db/schema";
import type { ScoreResult } from "../types";

export function rollupScores(parts: {
  seo: ScoreResult;
  trust: ScoreResult;
  conversion: ScoreResult;
  performance: ScoreResult;
  aiVisibility: ScoreResult;
  contentCoverage: ScoreResult;
  backlinkHealth: ScoreResult;
}): SelfOptScoreBreakdown {
  const unavailableReasons: Record<string, string> = {};
  const pick = (key: string, r: ScoreResult): number | null => {
    if (r.score == null) {
      if (r.unavailableReason) unavailableReasons[key] = r.unavailableReason;
      return null;
    }
    if (r.unavailableReason) unavailableReasons[key] = r.unavailableReason;
    return r.score;
  };

  const seo = pick("seo", parts.seo);
  const trust = pick("trust", parts.trust);
  const conversion = pick("conversion", parts.conversion);
  const performance = pick("performance", parts.performance);
  const aiVisibility = pick("aiVisibility", parts.aiVisibility);
  const contentCoverage = pick("contentCoverage", parts.contentCoverage);
  const backlinkHealth = pick("backlinkHealth", parts.backlinkHealth);

  const available = [
    seo,
    trust,
    conversion,
    performance,
    aiVisibility,
    contentCoverage,
    backlinkHealth,
  ].filter((n): n is number => n != null);

  const overall =
    available.length === 0
      ? null
      : Math.round(available.reduce((a, b) => a + b, 0) / available.length);

  return {
    overall,
    seo,
    trust,
    conversion,
    performance,
    aiVisibility,
    contentCoverage,
    backlinkHealth,
    unavailableReasons,
  };
}

export function sumEstimatedOpportunity(
  findings: { estimatedOpportunity: number | null }[],
): number {
  return findings.reduce((s, f) => s + (f.estimatedOpportunity ?? 0), 0);
}
