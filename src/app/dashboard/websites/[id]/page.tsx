import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { OpportunityFix } from "@/db/schema";
import {
  WebsiteWorkspace,
  type WebsiteWorkspaceView,
} from "@/components/dashboard/website-workspace";
import { getWebsiteWorkspace } from "@/lib/analysis/reports";

export default async function WebsiteWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const workspace = await getWebsiteWorkspace(userId, id);
  if (!workspace) notFound();

  const data: WebsiteWorkspaceView = {
    website: {
      id: workspace.website.id,
      name: workspace.website.name,
      domain: workspace.website.domain,
      url: workspace.website.url,
      status: workspace.website.status,
    },
    latestReport: workspace.latestReport
      ? {
          id: workspace.latestReport.id,
          moneyGapScore: workspace.latestReport.moneyGapScore,
          revenueAtRisk: workspace.latestReport.revenueAtRisk,
        }
      : null,
    openGapsCount: workspace.openGapsCount,
    completedImprovementsCount: workspace.completedImprovementsCount,
    scanHistory: workspace.scanHistory.map((s) => ({
      id: s.id,
      status: s.status,
      scanProfile: s.scanProfile,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
      reportId: s.reportId,
      moneyGapScore: s.moneyGapScore,
      revenueAtRisk: s.revenueAtRisk,
    })),
    reports: workspace.reports.map((r) => ({
      id: r.id,
      title: r.title,
      moneyGapScore: r.moneyGapScore,
      revenueAtRisk: r.revenueAtRisk,
      createdAt: r.createdAt.toISOString(),
    })),
    opportunities: workspace.opportunities.map((o) => ({
      id: o.id,
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
    })),
  };

  return <WebsiteWorkspace data={data} />;
}
