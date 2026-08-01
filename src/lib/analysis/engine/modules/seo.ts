import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const seoModuleDef: ModuleDefinition = {
  id: "seo",
  name: "SEO Intelligence™",
  mission:
    "Find SEO gaps that block visibility→traffic→leads→revenue. Never stop at technical notes — always tie to business outcomes.",
  absenceCatalog: [
    "Weak or missing page titles / meta that clarify offer",
    "Missing schema / structured data for key offers",
    "Thin topical coverage for buyer-intent queries",
    "Poor internal linking between awareness and conversion pages",
    "Missing location or service landing pages",
    "Blog/content not mapped to funnel stages",
    "FAQ / comparison pages competitors typically have",
  ],
};

export async function runSeoModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(seoModuleDef, ctx, client, model);
}
