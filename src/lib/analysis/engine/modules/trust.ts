import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const trustModuleDef: ModuleDefinition = {
  id: "trust",
  name: "Trust Intelligence™",
  mission:
    "Find missing trust signals that reduce conversion — testimonials, reviews, guarantees, logos, certifications, proof.",
  absenceCatalog: [
    "Testimonials with specifics / outcomes",
    "Reviews or ratings visibility",
    "Case studies / before-after proof",
    "Customer logos or social proof",
    "Guarantees, risk-reversal, or refund policies",
    "Credentials, certifications, compliance badges",
    "Team / founder credibility pages",
  ],
};

export async function runTrustModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(trustModuleDef, ctx, client, model);
}
