import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const authorityModuleDef: ModuleDefinition = {
  id: "authority",
  name: "Authority Intelligence™",
  mission:
    "Find missing authority assets — backlinks signals, brand mentions, citations, digital PR, and partnerships — that limit trust and inbound growth.",
  absenceCatalog: [
    "Press / media mentions or as-seen-in proof",
    "Guest content, podcasts, or thought leadership distribution",
    "Partnerships, collaborations, or co-marketing",
    "Industry citations or directory presence signals",
    "Expert bios, bylines, or founder authority pages",
    "Awards, certifications, or third-party recognition",
    "Digital PR / outreach opportunities tied to traffic→leads",
  ],
};

export async function runAuthorityModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(authorityModuleDef, ctx, client, model);
}
