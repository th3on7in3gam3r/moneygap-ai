import type {
  ContentRoadmapItem,
  OiRecommendationDraft,
} from "@/lib/opportunity-intelligence/types";

export function buildContentRoadmap(
  recommendations: OiRecommendationDraft[],
): ContentRoadmapItem[] {
  return recommendations.slice(0, 16).map((r, i) => ({
    id: `roadmap-${i}-${r.kind}`,
    title: r.title,
    action: r.nextSteps[0] ?? r.summary,
    businessImpact: r.businessImpact,
    seoImpact: r.seoImpact,
    aiReadinessImpact: r.aiReadinessImpact,
    difficulty: r.difficulty,
    estimatedTime: r.estimatedTime,
    priority: r.priority,
    opportunityScore: r.opportunityScore,
    dependencies: r.dependencies,
    recommendationKind: r.kind,
  }));
}
