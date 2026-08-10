import OpenAI from "openai";
import { MODULE_RUNNERS } from "@/lib/analysis/engine/modules";
import { buildGrowthRoadmap } from "@/lib/analysis/engine/roadmap";
import {
  buildExecutiveBrief,
  computeCategoryScores,
  computeMoneyGapScore,
  computeRevenueRollups,
  normalizeFindingScores,
} from "@/lib/analysis/engine/scoring";
import type {
  EngineContext,
  MoneyGapEngineResult,
  MoneyGapFinding,
} from "@/lib/analysis/engine/types";
import {
  EMPTY_CATEGORY_SCORES,
  EMPTY_ROADMAP,
} from "@/lib/analysis/engine/types";
import {
  MISSING_KEYS_ERROR,
  MONEY_GAP_ENGINE_ERROR,
} from "@/lib/analysis/stages";
import { log } from "@/lib/observability/logger";

const CONCURRENCY = 3;

export type OrchestratorProgress = {
  modulesCompleted: number;
  modulesTotal: number;
  moduleId?: string;
  partial?: boolean;
};

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  opts?: {
    signal?: AbortSignal;
    onItemDone?: (index: number, ok: boolean) => void | Promise<void>;
  },
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function pump() {
    while (next < items.length) {
      if (opts?.signal?.aborted) {
        while (next < items.length) {
          const index = next++;
          results[index] = {
            status: "rejected",
            reason: Object.assign(new Error("Money Gap engine deadline exceeded"), {
              name: "AbortError",
            }),
          };
          await opts.onItemDone?.(index, false);
        }
        return;
      }
      const index = next++;
      const item = items[index]!;
      try {
        const value = await worker(item, index);
        results[index] = { status: "fulfilled", value };
        await opts?.onItemDone?.(index, true);
      } catch (reason) {
        results[index] = { status: "rejected", reason };
        await opts?.onItemDone?.(index, false);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    pump(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * MoneyGap Orchestrator — runs intelligence modules, normalizes, scores, roadmap.
 * Soft-fails per module: partial results still produce a usable report.
 */
export async function runMoneyGapOrchestrator(
  ctx: EngineContext,
  opts?: {
    signal?: AbortSignal;
    deadlineAtMs?: number;
    onProgress?: (p: OrchestratorProgress) => void | Promise<void>;
  },
): Promise<MoneyGapEngineResult & { partial: boolean; modulesFailed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const modulesTotal = MODULE_RUNNERS.length;
  let modulesCompleted = 0;
  let hitDeadline = false;

  const controller = new AbortController();
  const parent = opts?.signal;
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener("abort", () => controller.abort(), { once: true });

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  if (opts?.deadlineAtMs) {
    const remaining = opts.deadlineAtMs - Date.now();
    if (remaining <= 0) {
      controller.abort();
      hitDeadline = true;
    } else {
      deadlineTimer = setTimeout(() => {
        hitDeadline = true;
        controller.abort();
      }, remaining);
    }
  }

  const moduleCtx: EngineContext = {
    ...ctx,
    signal: controller.signal,
  };

  log("info", "ROADMAP_GENERATION_START", {
    modulesTotal,
    model,
    deadlineAtMs: opts?.deadlineAtMs ?? null,
  });

  try {
    await opts?.onProgress?.({
      modulesCompleted: 0,
      modulesTotal,
    });

    const settled = await runWithConcurrency(
      MODULE_RUNNERS,
      CONCURRENCY,
      async (mod) => {
        if (controller.signal.aborted) {
          throw Object.assign(new Error("Money Gap engine deadline exceeded"), {
            name: "AbortError",
          });
        }
        const findings = await mod.run(moduleCtx, client, model);
        return { id: mod.id, name: mod.name, findings };
      },
      {
        signal: controller.signal,
        onItemDone: async (index, ok) => {
          modulesCompleted += 1;
          const mod = MODULE_RUNNERS[index];
          await opts?.onProgress?.({
            modulesCompleted,
            modulesTotal,
            moduleId: mod?.id,
            partial: hitDeadline || !ok,
          });
        },
      },
    );

    const findings: MoneyGapFinding[] = [];
    let failures = 0;

    for (const result of settled) {
      if (result.status === "fulfilled") {
        findings.push(...result.value.findings);
      } else {
        failures += 1;
        console.error("MoneyGap module failed:", result.reason);
      }
    }

    if (findings.length === 0) {
      console.error(
        `MoneyGap Orchestrator: all modules failed (${failures}/${MODULE_RUNNERS.length})`,
      );
      throw new Error(MONEY_GAP_ENGINE_ERROR);
    }

    if (failures > 0 || hitDeadline) {
      console.warn(
        `MoneyGap Orchestrator: ${failures}/${MODULE_RUNNERS.length} modules failed` +
          (hitDeadline ? " (deadline)" : "") +
          "; continuing with partial findings.",
      );
    }

    const normalized = findings.map(normalizeFindingScores);
    const sorted = [...normalized].sort((a, b) => {
      const severityRank: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      const sev =
        (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
      if (sev !== 0) return sev;
      return b.opportunityIndex - a.opportunityIndex;
    });

    const categoryScores = computeCategoryScores(sorted);
    const moneyGapScore = computeMoneyGapScore(sorted, categoryScores);
    const { revenueAtRisk, capturePotential } = computeRevenueRollups(sorted);
    const { opportunitySummary, executiveBrief } = buildExecutiveBrief(sorted);
    const growthRoadmap = buildGrowthRoadmap(sorted);

    const partial = failures > 0 || hitDeadline;
    log("info", "ROADMAP_GENERATION_COMPLETE", {
      modulesTotal,
      modulesFailed: failures,
      findings: sorted.length,
      partial,
      hitDeadline,
      model,
    });

    return {
      opportunitySummary,
      executiveBrief,
      opportunities: sorted,
      categoryScores: categoryScores ?? EMPTY_CATEGORY_SCORES,
      growthRoadmap: growthRoadmap ?? EMPTY_ROADMAP,
      moneyGapScore,
      revenueAtRisk,
      capturePotential,
      partial,
      modulesFailed: failures,
    };
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
  }
}
