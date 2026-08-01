import OpenAI from "openai";
import { runIntelligenceModule } from "@/lib/analysis/engine/run-module";
import type {
  EngineContext,
  ModuleDefinition,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";

export const automationModuleDef: ModuleDefinition = {
  id: "automation",
  name: "Automation Intelligence™",
  mission:
    "Find missing automation that leaks leads and wastes time — email sequences, CRM, chat, tracking, booking automation.",
  absenceCatalog: [
    "Email welcome / nurture sequences",
    "CRM or lead routing signals",
    "Live chat or chatbot for capture",
    "Analytics / conversion tracking cues",
    "Booking automation (calendars, reminders)",
    "Abandoned form / cart recovery paths",
    "Tagging / segmentation for follow-up",
  ],
};

export async function runAutomationModule(
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  return runIntelligenceModule(automationModuleDef, ctx, client, model);
}
