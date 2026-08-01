import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const competitiveModuleDef: ModuleDefinition = {
  id: "competitive",
  name: "Competitive Intelligence™",
  mission:
    "Find initial competitive gaps vs typical peers in this model (deep network crawl is Phase 4). Focus on missing table-stakes and differentiation.",
  absenceCatalog: [
    "Comparison or alternative pages",
    "Differentiation messaging vs category norms",
    "Proof assets peers typically publish",
    "Pricing transparency relative to category",
    "Feature / offer completeness vs peers",
    "Content depth competitors usually own",
    "Partnership / distribution angles peers use",
  ],
};

export async function runCompetitiveModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(competitiveModuleDef, ctx, client, model);
}
