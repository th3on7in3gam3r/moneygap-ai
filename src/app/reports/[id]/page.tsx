import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { IntelligenceReport } from "@/components/intelligence/report-view";
import type { CompetitorProfileData, OpportunityFix } from "@/db/schema";
import { getBrandSettings } from "@/lib/agency/brand";
import { getIntelligenceReport } from "@/lib/analysis/reports";

export default async function IntelligenceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const { focus } = await searchParams;
  const report = await getIntelligenceReport(id, userId);
  if (!report) notFound();

  const brand = await getBrandSettings(report.workspaceId);

  return (
    <IntelligenceReport
      initialFocusId={focus ?? null}
      report={{
        id: report.id,
        title: report.title,
        overview: report.overview,
        opportunitySummary: report.opportunitySummary,
        executiveBrief: report.executiveBrief ?? null,
        moneyGapScore: report.moneyGapScore,
        revenueAtRisk: report.revenueAtRisk,
        capturePotential: report.capturePotential,
        intelligenceScore: report.intelligenceScore,
        moneyGapEngineStatus: report.moneyGapEngineStatus,
        moneyGapEngineError: report.moneyGapEngineError,
        competitiveEngineStatus: report.competitiveEngineStatus ?? null,
        competitiveEngineError: report.competitiveEngineError ?? null,
        competitiveBrief: report.competitiveBrief ?? null,
        competitiveAnalysis: report.competitiveAnalysis ?? null,
        competitors: (report.competitors ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          domain: c.domain,
          url: c.url,
          businessSummary: c.businessSummary,
          industry: c.industry,
          targetAudience: c.targetAudience,
          estimatedCompanySize: c.estimatedCompanySize,
          profile: (c.profile ?? null) as CompetitorProfileData | null,
          status: c.status,
        })),
        analysisId: report.analysis?.id ?? null,
        categoryScores: report.categoryScores ?? null,
        growthRoadmap: report.growthRoadmap ?? null,
        progressStats: report.progressStats,
        initialProjects: (report.actionProjects ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          progress: p.progress,
          priority: p.priority,
          businessImpact: p.businessImpact,
          playbook: p.playbook,
          updatedAt: p.updatedAt.toISOString(),
          assigneeUserId: p.assigneeUserId ?? null,
          deadline: p.deadline?.toISOString() ?? null,
          clientNotes: p.clientNotes ?? null,
          tasks: (p.tasks ?? []).map((t) => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            sortOrder: t.sortOrder,
          })),
        })),
        scoreBreakdown: report.scoreBreakdown ?? null,
        crawlabilityReport: report.crawlabilityReport ?? null,
        website: {
          name: report.website.name,
          domain: report.website.domain,
          url: report.website.url,
        },
        businessProfile: report.businessProfile,
        audienceProfile: report.audienceProfile,
        contentAnalysis: report.contentAnalysis,
        insights: report.insights,
        opportunities: report.moneyGapOpportunities.map((o) => ({
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
        agencyBrand: brand
          ? {
              companyName: brand.companyName,
              contactInfo: brand.contactInfo,
              reportFooter: brand.reportFooter,
              showPoweredBy: brand.showPoweredBy,
            }
          : null,
        analysisMeta: {
          completedAt: report.analysis?.completedAt?.toISOString() ?? null,
          durationMs: report.analysis?.durationMs ?? null,
          engineVersion: report.analysis?.engineVersion ?? null,
          trustVersion: report.analysis?.trustVersion ?? null,
        },
        industryPlaybook: report.industryPlaybook ?? null,
        industryGapReport: report.industryGapReport ?? null,
        revenueArchitecture: report.revenueArchitecture ?? null,
        businessModelGapReport: report.businessModelGapReport ?? null,
        patternMatchReport: report.patternMatchReport ?? null,
      }}
    />
  );
}
