import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const contentModuleDef: ModuleDefinition = {
  id: "content",
  name: "Content Intelligence™",
  mission:
    "Find missing content assets that would build authority, demand, and conversion — blog, guides, FAQ, case studies, freshness, topical depth.",
  absenceCatalog: [
    "Blog or resource hub",
    "Guides / playbooks for buyer problems",
    "FAQ content that reduces friction",
    "Case studies and proof stories",
    "Freshness / update cadence gaps",
    "Topical authority clusters vs one-off posts",
    "Lead-magnet content (checklists, templates)",
  ],
};

export async function runContentModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(contentModuleDef, ctx, client, model);
}
