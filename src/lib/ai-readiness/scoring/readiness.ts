import { RULESET_VERSION } from "../rules/registry";
import type {
  AiReadinessRecommendation,
  AiReadinessScoreBreakdown,
  AiReadinessScoreResult,
  AiReadinessSignals,
} from "../types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Calculate overall AI Readiness Score™ (0–100, higher = better).
 */
export function calculateAIReadiness(
  signals: AiReadinessSignals,
): AiReadinessScoreResult {
  const recommendations: AiReadinessRecommendation[] = [];

  // llms bucket (0–35)
  let llms = 0;
  if (!signals.llmsPresent) {
    recommendations.push({
      title: "Create llms.txt",
      priority: "high",
      impact: "Improve AI discoverability and machine understanding.",
      whyItMatters:
        "AI systems have no dedicated guidance document describing your organization and primary resources.",
      recommendedAction:
        "Generate and publish /llms.txt with organization, summary, and canonical URLs.",
      estimatedEffort: "low",
      ruleId: "llms/missing-file",
    });
  } else if (signals.llmsValidationScore == null) {
    llms = 18;
  } else {
    llms = Math.round((signals.llmsValidationScore / 100) * 35);
  }

  // structured data (0–25)
  let structuredData = 0;
  if (signals.hasJsonLd) structuredData += 10;
  else {
    recommendations.push({
      title: "Add structured data (JSON-LD)",
      priority: "high",
      impact: "Machine-readable entity graph for assistants.",
      whyItMatters: "Without JSON-LD, AI systems guess product identity.",
      recommendedAction: "Add Organization and page-type schema.org JSON-LD.",
      estimatedEffort: "medium",
    });
  }
  if (signals.hasOrganizationSchema) structuredData += 8;
  if (signals.hasFaqSchema) structuredData += 4;
  if (signals.hasArticleSchema) structuredData += 3;

  // entity / headings (0–15)
  let entityClarity = 0;
  if (signals.hasSemanticHeadings) entityClarity += 10;
  else {
    recommendations.push({
      title: "Improve semantic heading structure",
      priority: "medium",
      impact: "Clearer topic extraction for AI crawlers.",
      whyItMatters: "H1/H2 outlines help assistants segment content.",
      recommendedAction: "Ensure one H1 and supporting H2s on key pages.",
      estimatedEffort: "low",
    });
  }
  if (signals.hasCanonical) entityClarity += 5;

  // knowledge / docs / contact (0–15)
  let knowledge = 0;
  if (signals.hasDocumentation) knowledge += 6;
  else {
    recommendations.push({
      title: "Expose documentation URLs",
      priority: "medium",
      impact: "Docs improve answer-engine grounding.",
      whyItMatters: "Assistants prefer citable documentation.",
      recommendedAction: "Publish /docs (or help center) and link it from llms.txt.",
      estimatedEffort: "medium",
    });
  }
  if (signals.hasContactTransparency) knowledge += 5;
  knowledge += Math.min(4, signals.knowledgeResourceCount);

  // metadata / remainder (0–10) — fold residual from llms quality
  const metadata = signals.llmsPresent && (signals.llmsValidationScore ?? 0) >= 70 ? 10 : signals.llmsPresent ? 5 : 0;

  const breakdown: AiReadinessScoreBreakdown = {
    llms: clamp(llms),
    structuredData: clamp(structuredData),
    entityClarity: clamp(entityClarity),
    knowledge: clamp(knowledge),
    metadata: clamp(metadata),
  };

  const score = clamp(
    breakdown.llms +
      breakdown.structuredData +
      breakdown.entityClarity +
      breakdown.knowledge +
      breakdown.metadata,
  );

  return {
    score,
    breakdown,
    recommendations,
    rulesetVersion: RULESET_VERSION,
  };
}
