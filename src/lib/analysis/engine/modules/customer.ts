import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const customerModuleDef: ModuleDefinition = {
  id: "customer",
  name: "Customer Intelligence™",
  mission:
    "Find missing retention and LTV levers — onboarding, segments, loyalty loops, upsell paths for existing customers.",
  absenceCatalog: [
    "Onboarding / getting-started content",
    "Customer portal or account value path",
    "Loyalty, referral, or rewards loop",
    "Upsell / expansion offers for customers",
    "Segment-specific messaging",
    "Support / success resources that reduce churn",
    "Community or peer engagement",
  ],
};

export async function runCustomerModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(customerModuleDef, ctx, client, model);
}
