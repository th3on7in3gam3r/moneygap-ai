import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const aiModuleDef: ModuleDefinition = {
  id: "ai",
  name: "AI Intelligence™",
  mission:
    "Find missing AI leverage — assistants, personalization, AI content/ops — that peers use to scale growth.",
  absenceCatalog: [
    "AI assistant / chatbot for FAQ and lead qualify",
    "Personalization by audience or intent",
    "AI-assisted content or support ops signals",
    "Recommendation engines for products/services",
    "Automated research / report tools for customers",
    "AI-powered booking or intake qualification",
  ],
};

export async function runAiModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(aiModuleDef, ctx, client, model);
}
