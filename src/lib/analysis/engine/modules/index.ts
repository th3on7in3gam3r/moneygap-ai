import type OpenAI from "openai";
import { runAiModule } from "@/lib/analysis/engine/modules/ai";
import { runAuthorityModule } from "@/lib/analysis/engine/modules/authority";
import { runAutomationModule } from "@/lib/analysis/engine/modules/automation";
import { runCompetitiveModule } from "@/lib/analysis/engine/modules/competitive";
import { runContentModule } from "@/lib/analysis/engine/modules/content";
import { runConversionModule } from "@/lib/analysis/engine/modules/conversion";
import { runCustomerModule } from "@/lib/analysis/engine/modules/customer";
import { runMarketingModule } from "@/lib/analysis/engine/modules/marketing";
import { runRevenueModule } from "@/lib/analysis/engine/modules/revenue";
import { runSeoModule } from "@/lib/analysis/engine/modules/seo";
import { runTrustModule } from "@/lib/analysis/engine/modules/trust";
import type {
  EngineContext,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export type ModuleRunner = (
  ctx: EngineContext,
  client: OpenAI,
  model: string,
) => Promise<MoneyGapFinding[]>;

export const MODULE_RUNNERS: { id: string; name: string; run: ModuleRunner }[] =
  [
    { id: "revenue", name: "Revenue Intelligence™", run: runRevenueModule },
    { id: "authority", name: "Authority Intelligence™", run: runAuthorityModule },
    { id: "seo", name: "SEO Intelligence™", run: runSeoModule },
    { id: "content", name: "Content Intelligence™", run: runContentModule },
    { id: "trust", name: "Trust Intelligence™", run: runTrustModule },
    {
      id: "conversion",
      name: "Conversion Intelligence™",
      run: runConversionModule,
    },
    {
      id: "marketing",
      name: "Marketing Intelligence™",
      run: runMarketingModule,
    },
    {
      id: "automation",
      name: "Automation Intelligence™",
      run: runAutomationModule,
    },
    {
      id: "customer",
      name: "Customer Intelligence™",
      run: runCustomerModule,
    },
    { id: "ai", name: "AI Intelligence™", run: runAiModule },
    {
      id: "competitive",
      name: "Competitive Intelligence™",
      run: runCompetitiveModule,
    },
  ];
