import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const marketingModuleDef: ModuleDefinition = {
  id: "marketing",
  name: "Marketing Intelligence™",
  mission:
    "Find missing marketing systems — channels, offers, campaigns, lead magnets, funnels — that limit demand generation.",
  absenceCatalog: [
    "Lead magnets and gated offers",
    "Clear campaign / promotion landing paths",
    "Multi-step funnel (awareness → nurture → convert)",
    "Channel-specific offers (organic, paid, referral)",
    "Retargeting / remarketing content hooks",
    "Seasonal or urgency campaigns",
    "Referral or word-of-mouth program",
  ],
};

export async function runMarketingModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(marketingModuleDef, ctx, client, model);
}
