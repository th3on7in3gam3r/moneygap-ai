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

const CONCURRENCY = 3;

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function pump() {
    while (next < items.length) {
      const index = next++;
      const item = items[index]!;
      try {
        const value = await worker(item);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
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
): Promise<MoneyGapEngineResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  const settled = await runWithConcurrency(
    MODULE_RUNNERS,
    CONCURRENCY,
    async (mod) => {
      const findings = await mod.run(ctx, client, model);
      return { id: mod.id, name: mod.name, findings };
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

  if (failures > 0) {
    console.warn(
      `MoneyGap Orchestrator: ${failures}/${MODULE_RUNNERS.length} modules failed; continuing with partial findings.`,
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

  return {
    opportunitySummary,
    executiveBrief,
    opportunities: sorted,
    categoryScores: categoryScores ?? EMPTY_CATEGORY_SCORES,
    growthRoadmap: growthRoadmap ?? EMPTY_ROADMAP,
    moneyGapScore,
    revenueAtRisk,
    capturePotential,
  };
}
