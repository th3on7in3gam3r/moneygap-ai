import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const conversionModuleDef: ModuleDefinition = {
  id: "conversion",
  name: "Conversion Intelligence™",
  mission:
    "Find conversion friction — CTAs, forms, booking, checkout, mobile UX, lead capture — that block leads and revenue.",
  absenceCatalog: [
    "Clear primary CTA above the fold",
    "Lead capture / email signup path",
    "Booking or demo request flow",
    "Checkout or payment clarity",
    "Form friction (too long / unclear)",
    "Mobile conversion UX gaps",
    "Offer clarity on key landing pages",
  ],
};

export async function runConversionModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(conversionModuleDef, ctx, client, model);
}
