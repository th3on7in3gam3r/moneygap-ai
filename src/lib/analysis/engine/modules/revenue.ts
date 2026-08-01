import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const revenueModuleDef: ModuleDefinition = {
  id: "revenue",
  name: "Revenue Intelligence™",
  mission:
    "Find missing monetization paths that leave revenue on the table — newsletter, membership, products, pricing, upsells, trials, affiliates.",
  absenceCatalog: [
    "Newsletter / email list monetization path",
    "Membership or subscription offer",
    "Digital products, courses, or paid resources",
    "Clear pricing page or package tiers",
    "Upsells, cross-sells, or bundles",
    "Free trial or freemium path into paid",
    "Affiliate or partner revenue program",
    "High-ticket consulting/booking path visibility",
  ],
};

export async function runRevenueModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(revenueModuleDef, ctx, client, model);
}
