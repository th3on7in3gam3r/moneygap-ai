import type { OpportunityFix } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import {
  MoneyGapsBoard,
  type MoneyGapBoardItem,
  type MoneyGapWebsiteOption,
} from "@/components/money-gap/money-gaps-board";
import { MgLoader } from "@/components/mg-loader";
import { Button } from "@/components/ui/button";
import { listUserOpenOpportunities } from "@/lib/analysis/reports";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getOpportunityPortfolio } from "@/lib/monitor/growth-journey";

export default async function MoneyGapsPage() {
  const { userId } = await auth();
  const realOpportunities = userId ? await listUserOpenOpportunities(userId) : [];

  let portfolio = null;
  if (userId) {
    try {
      const { workspace } = await ensureUserAndWorkspace();
      portfolio = await getOpportunityPortfolio(workspace.id);
    } catch {
      portfolio = null;
    }
  }

  const websiteMap = new Map<string, MoneyGapWebsiteOption>();
  for (const o of realOpportunities) {
    const site = o.report?.website;
    if (!site) continue;
    if (!websiteMap.has(site.id)) {
      websiteMap.set(site.id, {
        id: site.id,
        label: site.name?.trim() || site.domain || "Website",
      });
    }
  }
  const websites = [...websiteMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const opportunities: MoneyGapBoardItem[] = realOpportunities
    .filter((o) => o.report?.website?.id)
    .map((o) => {
      const site = o.report!.website!;
      return {
        id: o.id,
        reportId: o.reportId,
        websiteId: site.id,
        websiteLabel: site.name?.trim() || site.domain || "Website",
        title: o.title,
        category: o.category,
        moduleId: o.moduleId,
        detectionStatus: o.detectionStatus,
        summary: o.summary,
        whatsMissing: o.whatsMissing,
        whyItMatters: o.whyItMatters,
        businessImpact: o.businessImpact,
        estimatedAnnualRevenue: o.estimatedAnnualRevenue,
        estimatedLeads: o.estimatedLeads,
        estimatedTraffic: o.estimatedTraffic,
        estimatedConversionLift: o.estimatedConversionLift,
        estimateRationale: o.estimateRationale,
        confidence: o.confidence,
        likelyCauses: o.likelyCauses,
        fixes: (o.fixes ?? []) as OpportunityFix[],
        helpfulResources: o.helpfulResources,
        severity: o.severity,
        difficulty: o.difficulty,
        estimatedTime: o.estimatedTime,
        expectedRoi: o.expectedRoi,
        opportunityIndex: o.opportunityIndex,
        priorityScore: o.priorityScore,
        implementationStatus: o.implementationStatus,
        lifecycleStatus: o.lifecycleStatus,
        evidenceSummary: o.evidenceSummary,
        supportingSignals: o.supportingSignals,
        businessReasoning: o.businessReasoning,
        detectionSource: o.detectionSource,
        confidenceLevel: o.confidenceLevel,
        confidenceIntel: o.confidenceIntel ?? null,
      };
    });

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Money Gaps
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Missing opportunities ranked by business impact — with AI estimates
            and action plans.
          </p>
        </div>
        <Button href="/dashboard/analyze" size="sm">
          Analyze New Website
        </Button>
      </div>

      <Suspense
        fallback={<MgLoader label="Loading Money Gaps…" size="sm" />}
      >
        <MoneyGapsBoard
          opportunities={opportunities}
          websites={websites}
          portfolio={portfolio}
        />
      </Suspense>
    </div>
  );
}
