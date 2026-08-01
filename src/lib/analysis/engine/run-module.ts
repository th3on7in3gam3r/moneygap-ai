import OpenAI from "openai";
import {
  buildModuleInstructions,
  moduleOutputSchema,
} from "@/lib/analysis/engine/prompts";
import type {
  EngineContext,
  ModuleDefinition,
  ModuleId,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";
import { MONEY_GAP_ENGINE_ERROR } from "@/lib/analysis/stages";
import { withRetry } from "@/lib/observability/logger";

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) {
          return part.text;
        }
      }
    }
  }
  throw new Error(MONEY_GAP_ENGINE_ERROR);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : min)));
}

function normalizeFinding(
  raw: MoneyGapFinding,
  moduleId: ModuleId,
): MoneyGapFinding {
  return {
    ...raw,
    moduleId,
    category: raw.category || moduleId,
    detectionStatus: raw.detectionStatus || "not_found",
    summary: raw.summary || raw.whatsMissing?.slice(0, 160) || raw.title,
    confidence: clamp(raw.confidence),
    priorityScore: clamp(raw.priorityScore),
    opportunityIndex: clamp(raw.opportunityIndex),
    expectedRoi: clamp(raw.expectedRoi ?? 3, 1, 5),
    difficulty: raw.difficulty || "medium",
    estimatedTime: raw.estimatedTime || "TBD",
    likelyCauses: raw.likelyCauses ?? [],
    helpfulResources: raw.helpfulResources ?? [],
    evidenceSummary: raw.evidenceSummary,
    supportingSignals: raw.supportingSignals ?? [],
    businessReasoning: raw.businessReasoning,
    detectionSource: raw.detectionSource || `module:${moduleId}`,
    fixes: (raw.fixes ?? []).map((f) => ({
      ...f,
      resources: f.resources ?? null,
    })),
  };
}

export async function runIntelligenceModule(
  def: ModuleDefinition,
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  const response = await withRetry(
    () =>
      client.responses.create({
        model,
        instructions: buildModuleInstructions(def, ctx.kgContext),
        input: `Website: ${ctx.url} (${ctx.domain})

Business intelligence JSON:
${JSON.stringify(ctx.intelligence)}

Crawled website content (excerpt):
${ctx.corpus.slice(0, 45000)}`,
        text: {
          format: {
            type: "json_schema",
            name: `moneygap_${def.id}_module`,
            strict: true,
            schema: moduleOutputSchema,
          },
        },
      }),
    { attempts: 3, label: `openai_module_${def.id}` },
  );

  const text = extractOutputText(response);
  const parsed = JSON.parse(text) as { findings: MoneyGapFinding[] };
  return (parsed.findings ?? []).map((f) => normalizeFinding(f, def.id));
}
