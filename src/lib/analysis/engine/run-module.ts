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
import { estimateTokenCount } from "@/lib/analysis/corpus";
import { createStructuredJsonText } from "@/lib/analysis/llm-request";
import { MODULE_CORPUS_MAX_CHARS } from "@/lib/analysis/roadmap-errors";
import { MONEY_GAP_ENGINE_ERROR } from "@/lib/analysis/stages";
import { log } from "@/lib/observability/logger";

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

function mergeAbortSignals(
  ...signals: Array<AbortSignal | undefined>
): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => Boolean(s));
  if (active.length === 0) return AbortSignal.timeout(90_000);
  if (active.length === 1) return active[0]!;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener(
      "abort",
      () => controller.abort(signal.reason),
      { once: true },
    );
  }
  return controller.signal;
}

export async function runIntelligenceModule(
  def: ModuleDefinition,
  ctx: EngineContext,
  client: OpenAI,
  model: string,
): Promise<MoneyGapFinding[]> {
  const MODULE_TIMEOUT_MS = 90_000;
  if (ctx.signal?.aborted) {
    throw Object.assign(new Error("Money Gap engine deadline exceeded"), {
      name: "AbortError",
    });
  }
  const corpusExcerpt = ctx.corpus.slice(0, MODULE_CORPUS_MAX_CHARS);
  const intelJson = JSON.stringify(ctx.intelligence);
  const input = `Website: ${ctx.url} (${ctx.domain})

Business intelligence JSON:
${intelJson}

Crawled website content (compact excerpt):
${corpusExcerpt}`;

  log("info", "llm_request_budget", {
    stage: `moneygap_module_${def.id}`,
    model,
    moduleId: def.id,
    inputChars: input.length,
    estimatedTokens: estimateTokenCount(input),
    corpusChars: corpusExcerpt.length,
  });

  const text = await createStructuredJsonText({
    client,
    model,
    instructions: buildModuleInstructions(def, ctx.kgContext),
    input,
    schemaName: `moneygap_${def.id}_module`,
    schema: JSON.parse(JSON.stringify(moduleOutputSchema)) as Record<
      string,
      unknown
    >,
    timeoutMs: MODULE_TIMEOUT_MS,
    signal: mergeAbortSignals(
      AbortSignal.timeout(MODULE_TIMEOUT_MS),
      ctx.signal,
    ),
    label: `openai_module_${def.id}`,
  });

  let parsed: { findings: MoneyGapFinding[] };
  try {
    parsed = JSON.parse(text) as { findings: MoneyGapFinding[] };
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error(MONEY_GAP_ENGINE_ERROR);
    parsed = JSON.parse(text.slice(start, end + 1)) as {
      findings: MoneyGapFinding[];
    };
  }
  return (parsed.findings ?? []).map((f) => normalizeFinding(f, def.id));
}
