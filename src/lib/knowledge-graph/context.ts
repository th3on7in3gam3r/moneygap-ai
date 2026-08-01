import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kgBusinessModels, kgIndustries } from "@/db/schema";
import type { IntelligenceResult } from "@/lib/analysis/openai";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
import { matchPatternsForContext } from "@/lib/knowledge-graph/pattern-match";
import { loadActiveRecommendations } from "@/lib/knowledge-graph/recommendations";
import { isActiveStatus } from "@/lib/knowledge-graph/taxonomy";

/**
 * Compact Knowledge Graph pack for Engine module prompts.
 * Soft-fail callers should catch; empty string means no guidance.
 */
export async function buildEngineKgContext(
  classification: ClassificationResult,
  intelligence: IntelligenceResult,
): Promise<string> {
  await ensureKnowledgeCatalog();

  const lines: string[] = [];

  const rawIndustry = intelligence.business?.industry?.trim();
  const rawModel = intelligence.business?.businessModel?.trim();
  if (rawIndustry) lines.push(`Observed industry label: ${rawIndustry}`);
  if (rawModel) lines.push(`Observed business model label: ${rawModel}`);

  if (classification.industrySlug) {
    const industry = await db.query.kgIndustries.findFirst({
      where: eq(kgIndustries.slug, classification.industrySlug),
    });
    if (industry && isActiveStatus(industry.status)) {
      lines.push(`Industry: ${industry.name} (${industry.slug})`);
      lines.push(`- Revenue models: ${industry.profile.revenueModels.join(", ")}`);
      lines.push(`- Trust signals expected: ${industry.profile.trustSignals.join(", ")}`);
      lines.push(`- Growth priorities: ${industry.profile.growthPriorities.join(", ")}`);
      lines.push(`- Website features expected: ${industry.profile.websiteFeatures.join(", ")}`);
    }
  }

  if (classification.businessModelSlug) {
    const model = await db.query.kgBusinessModels.findFirst({
      where: eq(kgBusinessModels.slug, classification.businessModelSlug),
    });
    if (model && isActiveStatus(model.status)) {
      lines.push(`Business model: ${model.name} (${model.slug})`);
      if (model.profile) {
        lines.push(`- Revenue structure: ${model.profile.revenueStructure.join(", ")}`);
        lines.push(`- Growth levers: ${model.profile.growthLevers.join(", ")}`);
        lines.push(`- Common gaps: ${model.profile.commonGaps.join(", ")}`);
        lines.push(
          `- Revenue stages: ${model.profile.revenueStages.map((s) => s.label).join(" → ")}`,
        );
      }
    } else {
      lines.push(`Business model: ${classification.businessModelSlug}`);
    }
  }

  if (classification.modelEvidence?.length) {
    lines.push(
      `Model evidence: ${classification.modelEvidence
        .slice(0, 6)
        .map((e) => e.signal)
        .join("; ")}`,
    );
  }

  if (classification.confidence) {
    lines.push(`Classification confidence: ${classification.confidence}/100`);
  }

  const patterns = await matchPatternsForContext(classification);
  if (patterns.length > 0) {
    lines.push("Matched growth patterns to consider:");
    for (const p of patterns) {
      lines.push(
        `- [${p.category}] ${p.name} (${p.confidence}%): ${p.reasoning[0] ?? p.name}`,
      );
    }
  }

  const recs = await loadActiveRecommendations({
    industrySlug: classification.industrySlug,
    businessModelSlug: classification.businessModelSlug,
    limit: 6,
  });
  if (recs.length > 0) {
    lines.push("Active recommendations:");
    for (const r of recs) {
      const mod = r.moduleId ? ` [module:${r.moduleId}]` : "";
      lines.push(`- ${r.name}${mod}: ${r.summary}`);
    }
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}
