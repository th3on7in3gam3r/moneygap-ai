import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  growthGraphEdges,
  growthGraphNodes,
  oiContentBriefs,
  oiRecommendations,
  reports,
  websitePages,
  type OpportunityIntelligenceSnapshot,
} from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import { buildContentBrief } from "@/lib/opportunity-intelligence/content-briefs/build";
import { buildContentRoadmap } from "@/lib/opportunity-intelligence/content-roadmap/build";
import { discoverEntities } from "@/lib/opportunity-intelligence/entities/discover";
import { buildGrowthGraphDrafts } from "@/lib/opportunity-intelligence/growth-graph/build";
import { buildKeywordClusters } from "@/lib/opportunity-intelligence/keywords/clusters";
import { createLocalCorpusProvider } from "@/lib/opportunity-intelligence/providers";
import { discoverCustomerQuestions } from "@/lib/opportunity-intelligence/questions/discover";
import { buildRecommendations } from "@/lib/opportunity-intelligence/recommendations/build";
import { log } from "@/lib/observability/logger";

export async function runOpportunityIntelligencePass(input: {
  analysisId: string;
  reportId: string;
  workspaceId: string;
  websiteId: string;
  domain: string;
  url: string;
  intelligence: IntelligenceResult;
  corpus: string;
  moneyGapScore: number | null;
  competitorNames?: string[];
  competitorGapTitles?: string[];
  aiReadinessScore?: number | null;
}): Promise<OpportunityIntelligenceSnapshot | null> {
  try {
    const pages = await db.query.websitePages.findMany({
      where: eq(websitePages.analysisId, input.analysisId),
      columns: { url: true, title: true, pageType: true, markdown: true },
    });

    const products = [
      ...(input.intelligence.products?.products ?? []),
      ...(input.intelligence.business?.productsServices ?? []),
    ];
    const services = input.intelligence.products?.services ?? [];
    const contentCategories =
      input.intelligence.content?.contentCategories ?? [];
    const seoOpportunities =
      input.intelligence.content?.seoOpportunities ?? [];

    const provider = createLocalCorpusProvider(input.corpus);
    const clusters = buildKeywordClusters({
      corpus: input.corpus,
      pageTitles: pages.map((p) => p.title || p.url),
      products,
      services,
      contentCategories,
      seoOpportunities,
      brandHint: input.domain.split(".")[0],
    });
    await provider.getDemand(clusters.map((c) => c.primary));

    const { present, recommended } = discoverEntities({
      industry: input.intelligence.business?.industry,
      businessModel: input.intelligence.business?.businessModel,
      products,
      services,
      contentCategories,
    });

    const questions = discoverCustomerQuestions({
      services,
      products,
      problems: input.intelligence.audience?.customerProblems ?? [],
      audience: input.intelligence.audience?.primaryAudience,
    });

    const pageTypes = pages.map((p) => p.pageType);
    const recommendations = buildRecommendations({
      pageTypes,
      services,
      products,
      monetizationMissing: input.intelligence.monetization?.missing ?? [],
      questions,
      entitiesRecommended: recommended,
      clusters,
      competitorGapTitles: input.competitorGapTitles ?? [],
      hasFaqSchemaHint: pageTypes.includes("faq"),
      hasLlmsTxtHint: input.aiReadinessScore != null && input.aiReadinessScore >= 40,
    });

    const roadmap = buildContentRoadmap(recommendations);
    const graph = buildGrowthGraphDrafts({
      domain: input.domain,
      moneyGapScore: input.moneyGapScore,
      pages,
      products,
      services,
      clusters,
      entities: [...present, ...recommended],
      questions,
      competitors: input.competitorNames ?? [],
      recommendations,
      aiReadinessScore: input.aiReadinessScore ?? null,
    });

    // Replace prior graph / OI rows for this analysis
    await db
      .delete(growthGraphEdges)
      .where(eq(growthGraphEdges.analysisId, input.analysisId));
    await db
      .delete(growthGraphNodes)
      .where(eq(growthGraphNodes.analysisId, input.analysisId));
    await db
      .delete(oiRecommendations)
      .where(eq(oiRecommendations.analysisId, input.analysisId));
    await db
      .delete(oiContentBriefs)
      .where(eq(oiContentBriefs.analysisId, input.analysisId));

    const nodeIdByTemp = new Map<string, string>();
    if (graph.nodes.length > 0) {
      const inserted = await db
        .insert(growthGraphNodes)
        .values(
          graph.nodes.map((n) => ({
            workspaceId: input.workspaceId,
            websiteId: input.websiteId,
            analysisId: input.analysisId,
            nodeType: n.nodeType,
            label: n.label,
            slug: n.slug,
            meta: n.meta ?? {},
          })),
        )
        .returning({ id: growthGraphNodes.id });

      graph.nodes.forEach((n, i) => {
        const row = inserted[i];
        if (row) nodeIdByTemp.set(n.tempId, row.id);
      });
    }

    const edgeRows = graph.edges
      .map((e) => {
        const from = nodeIdByTemp.get(e.fromTempId);
        const to = nodeIdByTemp.get(e.toTempId);
        if (!from || !to) return null;
        return {
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          fromNodeId: from,
          toNodeId: to,
          edgeType: e.edgeType,
          weight: e.weight ?? 1,
          meta: e.meta ?? {},
        };
      })
      .filter(Boolean) as {
      workspaceId: string;
      analysisId: string;
      fromNodeId: string;
      toNodeId: string;
      edgeType: string;
      weight: number;
      meta: Record<string, unknown>;
    }[];

    if (edgeRows.length > 0) {
      await db.insert(growthGraphEdges).values(edgeRows);
    }

    const topForBriefs = recommendations.slice(0, 8);
    const briefIds: (string | null)[] = [];
    for (const rec of topForBriefs) {
      const payload = buildContentBrief(rec, {
        audience: input.intelligence.audience?.primaryAudience,
        services,
        pageUrls: pages.map((p) => p.url).slice(0, 8),
      });
      const [brief] = await db
        .insert(oiContentBriefs)
        .values({
          workspaceId: input.workspaceId,
          websiteId: input.websiteId,
          analysisId: input.analysisId,
          reportId: input.reportId,
          title: payload.suggestedTitle,
          primaryIntent: payload.primaryIntent,
          payload,
        })
        .returning({ id: oiContentBriefs.id });
      briefIds.push(brief?.id ?? null);
    }

    if (recommendations.length > 0) {
      await db.insert(oiRecommendations).values(
        recommendations.map((r, index) => ({
          workspaceId: input.workspaceId,
          websiteId: input.websiteId,
          analysisId: input.analysisId,
          reportId: input.reportId,
          kind: r.kind,
          title: r.title,
          summary: r.summary,
          whyItMatters: r.whyItMatters,
          businessImpact: r.businessImpact,
          seoImpact: r.seoImpact,
          aiReadinessImpact: r.aiReadinessImpact,
          difficulty: r.difficulty,
          estimatedTime: r.estimatedTime,
          priority: r.priority,
          opportunityScore: r.opportunityScore,
          scoreFactors: r.factors,
          dependencies: r.dependencies,
          nextSteps: r.nextSteps,
          intent: r.intent ?? null,
          moneyGapOpportunityId: r.moneyGapOpportunityId ?? null,
          briefId: index < briefIds.length ? briefIds[index] : null,
          implementationLinks: r.implementationLinks,
          meta: r.meta ?? {},
          sortOrder: index,
        })),
      );
    }

    const avg =
      recommendations.length > 0
        ? Math.round(
            recommendations.reduce((s, r) => s + r.opportunityScore, 0) /
              recommendations.length,
          )
        : null;

    const snapshot: OpportunityIntelligenceSnapshot = {
      generatedAt: new Date().toISOString(),
      recommendationCount: recommendations.length,
      roadmapCount: roadmap.length,
      briefCount: briefIds.filter(Boolean).length,
      graphNodeCount: graph.nodes.length,
      graphEdgeCount: edgeRows.length,
      keywordClusterCount: clusters.length,
      questionCount: questions.length,
      entityCount: present.length + recommended.length,
      avgOpportunityScore: avg,
      topRecommendations: recommendations.slice(0, 5).map((r) => ({
        title: r.title,
        kind: r.kind,
        opportunityScore: r.opportunityScore,
        businessImpact: r.businessImpact,
      })),
      roadmapPreview: roadmap.slice(0, 5).map((r) => ({
        title: r.title,
        businessImpact: r.businessImpact,
        opportunityScore: r.opportunityScore,
      })),
      executiveBlurb:
        recommendations[0] != null
          ? `Opportunity Intelligence™ highlights ${recommendations.length} growth opportunities. Top priority: ${recommendations[0].title} (Opportunity Score™ ${recommendations[0].opportunityScore}).`
          : "Opportunity Intelligence™ found limited coverage gaps on this scan.",
    };

    await db
      .update(reports)
      .set({ opportunityIntelligence: snapshot })
      .where(and(eq(reports.id, input.reportId)));

    // Soft-append executive brief with OI blurb
    try {
      const report = await db.query.reports.findFirst({
        where: eq(reports.id, input.reportId),
        columns: { executiveBrief: true },
      });
      if (report && snapshot.executiveBlurb) {
        const existing = report.executiveBrief?.trim() ?? "";
        const blurb = `\n\n### Opportunity Intelligence™\n${snapshot.executiveBlurb}`;
        if (!existing.includes("Opportunity Intelligence™")) {
          await db
            .update(reports)
            .set({
              executiveBrief: existing ? `${existing}${blurb}` : snapshot.executiveBlurb,
            })
            .where(eq(reports.id, input.reportId));
        }
      }
    } catch {
      /* soft-fail brief append */
    }

    log("info", "opportunity_intelligence_persisted", {
      analysisId: input.analysisId,
      recommendations: recommendations.length,
      nodes: graph.nodes.length,
      edges: edgeRows.length,
    });

    return snapshot;
  } catch (err) {
    log("warn", "opportunity_intelligence_soft_fail", {
      analysisId: input.analysisId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
