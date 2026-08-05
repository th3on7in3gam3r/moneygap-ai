import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  growthGraphEdges,
  growthGraphNodes,
  oiContentBriefs,
  oiRecommendations,
  reports,
  websites,
} from "@/db/schema";
import { buildContentRoadmap } from "@/lib/opportunity-intelligence/content-roadmap/build";
import type { OiRecommendationDraft } from "@/lib/opportunity-intelligence/types";

export async function getOiSummaryForWebsite(input: {
  workspaceId: string;
  websiteId: string;
}) {
  const site = await db.query.websites.findFirst({
    where: and(
      eq(websites.id, input.websiteId),
      eq(websites.workspaceId, input.workspaceId),
    ),
  });
  if (!site) return { ok: false as const, error: "Website not found" };

  const report = await db.query.reports.findFirst({
    where: and(
      eq(reports.websiteId, input.websiteId),
      eq(reports.workspaceId, input.workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });

  const analysisId = report
    ? (
        await db.query.oiRecommendations.findFirst({
          where: and(
            eq(oiRecommendations.websiteId, input.websiteId),
            eq(oiRecommendations.workspaceId, input.workspaceId),
          ),
          orderBy: [desc(oiRecommendations.createdAt)],
          columns: { analysisId: true },
        })
      )?.analysisId
    : null;

  const recs = analysisId
    ? await db.query.oiRecommendations.findMany({
        where: eq(oiRecommendations.analysisId, analysisId),
        orderBy: [desc(oiRecommendations.opportunityScore)],
        limit: 50,
      })
    : [];

  const briefs = analysisId
    ? await db.query.oiContentBriefs.findMany({
        where: eq(oiContentBriefs.analysisId, analysisId),
        orderBy: [desc(oiContentBriefs.createdAt)],
        limit: 20,
      })
    : [];

  const nodes = analysisId
    ? await db.query.growthGraphNodes.findMany({
        where: eq(growthGraphNodes.analysisId, analysisId),
        limit: 200,
      })
    : [];

  const edges = analysisId
    ? await db.query.growthGraphEdges.findMany({
        where: eq(growthGraphEdges.analysisId, analysisId),
        limit: 400,
      })
    : [];

  const roadmap = buildContentRoadmap(
    recs.map(
      (r): OiRecommendationDraft => ({
        kind: r.kind as OiRecommendationDraft["kind"],
        title: r.title,
        summary: r.summary,
        whyItMatters: r.whyItMatters,
        businessImpact: r.businessImpact as OiRecommendationDraft["businessImpact"],
        seoImpact: r.seoImpact as OiRecommendationDraft["seoImpact"],
        aiReadinessImpact:
          r.aiReadinessImpact as OiRecommendationDraft["aiReadinessImpact"],
        difficulty: r.difficulty,
        estimatedTime: r.estimatedTime,
        priority: r.priority,
        dependencies: (r.dependencies as string[]) ?? [],
        nextSteps: (r.nextSteps as string[]) ?? [],
        factors: r.scoreFactors ?? {
          businessValue: 0.5,
          revenuePotential: 0.5,
          searchDemand: 0.5,
          competition: 0.5,
          implementationEffort: 0.5,
          aiVisibility: 0.5,
          topicalAuthority: 0.5,
        },
        opportunityScore: r.opportunityScore,
        intent: (r.intent as OiRecommendationDraft["intent"]) ?? null,
        moneyGapOpportunityId: r.moneyGapOpportunityId,
        implementationLinks:
          (r.implementationLinks as { label: string; href: string }[]) ?? [],
      }),
    ),
  );

  return {
    ok: true as const,
    website: {
      id: site.id,
      name: site.name,
      domain: site.domain,
      url: site.url,
    },
    snapshot: report?.opportunityIntelligence ?? null,
    moneyGapScore: report?.moneyGapScore ?? null,
    analysisId,
    reportId: report?.id ?? null,
    recommendations: recs,
    briefs,
    roadmap,
    graph: {
      nodes: nodes.map((n) => ({
        id: n.id,
        nodeType: n.nodeType,
        label: n.label,
        slug: n.slug,
        meta: n.meta,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        edgeType: e.edgeType,
        weight: e.weight,
      })),
    },
  };
}

export async function getOiBrief(input: {
  workspaceId: string;
  briefId: string;
}) {
  const brief = await db.query.oiContentBriefs.findFirst({
    where: and(
      eq(oiContentBriefs.id, input.briefId),
      eq(oiContentBriefs.workspaceId, input.workspaceId),
    ),
  });
  if (!brief) return { ok: false as const, error: "Brief not found" };
  return { ok: true as const, brief };
}
