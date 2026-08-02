import type { SelfOptScoreBreakdown } from "@/db/schema";
import type { CrawlabilityResult } from "@/lib/crawlability";
import type { ScoreResult } from "../types";

export function rollupScores(parts: {
  seo: ScoreResult;
  trust: ScoreResult;
  conversion: ScoreResult;
  performance: ScoreResult;
  aiVisibility: ScoreResult;
  contentCoverage: ScoreResult;
  backlinkHealth: ScoreResult;
  crawlability?: CrawlabilityResult | ScoreResult | null;
}): SelfOptScoreBreakdown {
  const unavailableReasons: Record<string, string> = {};
  const pick = (key: string, r: ScoreResult | CrawlabilityResult | null | undefined): number | null => {
    if (!r || r.score == null) {
      if (r && "unavailableReason" in r && r.unavailableReason) {
        unavailableReasons[key] = r.unavailableReason;
      }
      if (r && "unavailableReasons" in r && r.unavailableReasons) {
        for (const [k, v] of Object.entries(r.unavailableReasons)) {
          unavailableReasons[`${key}.${k}`] = v;
        }
      }
      return null;
    }
    if ("unavailableReason" in r && r.unavailableReason) {
      unavailableReasons[key] = r.unavailableReason;
    }
    if ("unavailableReasons" in r && r.unavailableReasons) {
      for (const [k, v] of Object.entries(r.unavailableReasons)) {
        unavailableReasons[`${key}.${k}`] = v;
      }
    }
    return r.score;
  };

  const seo = pick("seo", parts.seo);
  const trust = pick("trust", parts.trust);
  const conversion = pick("conversion", parts.conversion);
  const performance = pick("performance", parts.performance);
  const aiVisibility = pick("aiVisibility", parts.aiVisibility);
  const contentCoverage = pick("contentCoverage", parts.contentCoverage);
  const backlinkHealth = pick("backlinkHealth", parts.backlinkHealth);
  const crawlability = pick("crawlability", parts.crawlability ?? null);

  const available = [
    seo,
    trust,
    conversion,
    performance,
    aiVisibility,
    contentCoverage,
    backlinkHealth,
    crawlability,
  ].filter((n): n is number => n != null);

  const overall =
    available.length === 0
      ? null
      : Math.round(available.reduce((a, b) => a + b, 0) / available.length);

  const crawl =
    parts.crawlability && "contributors" in parts.crawlability
      ? parts.crawlability
      : null;

  return {
    overall,
    seo,
    trust,
    conversion,
    performance,
    aiVisibility,
    contentCoverage,
    backlinkHealth,
    crawlability,
    crawlabilityStatus: crawl?.status ?? null,
    crawlabilityContributors: crawl?.contributors ?? null,
    crawlabilitySummary: crawl?.executiveSummary ?? null,
    crawlabilityEstimatedImprovement: crawl?.estimatedImprovement ?? null,
    unavailableReasons,
  };
}

export function sumEstimatedOpportunity(
  findings: { estimatedOpportunity: number | null }[],
): number {
  return findings.reduce((s, f) => s + (f.estimatedOpportunity ?? 0), 0);
}
