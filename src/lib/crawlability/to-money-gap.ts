import type { MoneyGapFinding } from "@/lib/analysis/engine/types";
import type { CrawlabilityFinding } from "./types";

/** Map crawlability findings into SEO Money Gap opportunities (high/critical only). */
export function crawlabilityFindingsToMoneyGaps(
  findings: CrawlabilityFinding[],
): MoneyGapFinding[] {
  return findings
    .filter((f) => f.priority === "critical" || f.priority === "high")
    .map((f) => {
      const severity = f.priority;
      const difficulty =
        f.difficulty === "easy" || f.difficulty === "hard" ? f.difficulty : "medium";
      return {
        moduleId: "seo" as const,
        category: "SEO · Crawlability",
        title: f.title,
        detectionStatus: "found" as const,
        summary: f.problem,
        whatsMissing: f.problem,
        whyItMatters: f.whyItMatters,
        businessImpact: f.businessImpact,
        estimatedAnnualRevenue: f.estimatedOpportunity ?? 0,
        estimatedLeads: 0,
        estimatedTraffic: 0,
        estimatedConversionLift: 0,
        estimateRationale: "AI Estimate from Crawlability Score™ evidence.",
        confidence: f.confidence,
        likelyCauses: f.evidence.slice(0, 4),
        fixes: [
          {
            tier: "quick_win" as const,
            action: f.fixPath,
            difficulty,
            estimatedTime: f.estimatedTime,
            priority: severity,
            expectedImpact: f.businessImpact,
          },
        ],
        helpfulResources: [],
        severity,
        difficulty,
        estimatedTime: f.estimatedTime,
        expectedRoi: severity === "critical" ? 5 : 4,
        opportunityIndex: 0,
        priorityScore: severity === "critical" ? 90 : 75,
        evidenceSummary: f.evidence.join(" · ").slice(0, 500),
        supportingSignals: f.evidence.slice(0, 6),
        detectionSource: "crawlability_engine",
        businessReasoning: f.whyItMatters,
      };
    });
}
