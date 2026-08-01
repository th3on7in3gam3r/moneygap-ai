import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  whatIfScenarios,
  type WhatIfInputs,
  type WhatIfResult,
} from "@/db/schema";
import { scorePredictionConfidence } from "@/lib/predictive/confidence";
import { loadPredictiveFeedContext } from "@/lib/predictive/context";

function clampPct(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(-50, Math.min(200, n));
}

export function simulateWhatIf(input: {
  inputs: WhatIfInputs;
  baseScore: number | null;
  baseRevenueAtRisk: number;
  evidenceExtra?: string[];
}): WhatIfResult {
  const conv = clampPct(input.inputs.conversionLiftPct);
  const traffic = clampPct(input.inputs.trafficGrowthPct);
  const pricing = clampPct(input.inputs.pricingChangePct);
  const content = clampPct(input.inputs.contentProductionBoostPct);
  const automation = clampPct(input.inputs.automationAdoptionPct);

  // Heuristic: score improves (lower MoneyGap risk) when levers are positive
  const scoreRelief =
    conv * 0.08 + traffic * 0.05 + content * 0.04 + automation * 0.06 - Math.abs(pricing) * 0.02;
  const revenueReliefPct =
    (conv * 0.4 + traffic * 0.35 + pricing * 0.25 + content * 0.15 + automation * 0.2) / 100;

  const evidence = [
    `Levers: conversion ${conv}%, traffic ${traffic}%, pricing ${pricing}%, content ${content}%, automation ${automation}%`,
    input.baseScore != null ? `Base MoneyGap Score™ ${input.baseScore}` : "No base score",
    input.baseRevenueAtRisk > 0
      ? `Base revenue at risk $${input.baseRevenueAtRisk.toLocaleString()}`
      : "No revenue-at-risk baseline",
    ...(input.evidenceExtra ?? []),
  ];

  const confidence = scorePredictionConfidence({
    evidenceCount: evidence.length,
    snapshotCount: input.baseScore != null ? 2 : 0,
    softFailNotes: input.baseScore == null ? 2 : 0,
    horizon: "30d",
  });

  const horizons: WhatIfResult["horizons"] = (
    [
      ["7d", 0.35],
      ["30d", 1],
      ["90d", 1.45],
    ] as const
  ).map(([horizon, mult]) => {
    const projectedScoreDelta = -Math.round(scoreRelief * mult); // negative = less gap risk
    const projectedRevenueDelta = -Math.round(
      input.baseRevenueAtRisk * revenueReliefPct * mult,
    );
    return {
      horizon,
      projectedScoreDelta,
      projectedRevenueDelta,
      summary: `AI Estimate: score Δ ${projectedScoreDelta}, revenue-at-risk Δ $${projectedRevenueDelta.toLocaleString()} over ${horizon}.`,
    };
  });

  return {
    labeled: "AI Estimate",
    horizons,
    evidence,
    confidence,
    recommendedAction:
      "If the scenario looks attractive, pick Fix Paths on the highest-OI open gaps — drafts only, never auto-publish.",
  };
}

export async function runWhatIfScenario(input: {
  workspaceId: string;
  userId: string;
  title?: string;
  inputs: WhatIfInputs;
  websiteId?: string | null;
}) {
  const ctx = await loadPredictiveFeedContext(
    input.workspaceId,
    input.websiteId,
  );
  const siteLabel =
    ctx.websiteDomain || ctx.websiteName
      ? `${ctx.websiteName ?? ""}${ctx.websiteName && ctx.websiteDomain ? " · " : ""}${ctx.websiteDomain ?? ""}`
      : null;
  const result = simulateWhatIf({
    inputs: input.inputs,
    baseScore: ctx.latestScore,
    baseRevenueAtRisk: ctx.scores[0]?.revenueAtRisk ?? 0,
    evidenceExtra: [
      ...(siteLabel ? [`Property: ${siteLabel}`] : []),
      ...ctx.openGaps.slice(0, 2).map((g) => `Open gap: ${g.title}`),
    ],
  });

  const [row] = await db
    .insert(whatIfScenarios)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      title:
        input.title?.trim() ||
        (siteLabel ? `What-If · ${siteLabel}` : "What-If scenario"),
      inputs: input.inputs,
      result,
      status: "draft",
    })
    .returning();

  return row!;
}

export async function listWhatIfScenarios(workspaceId: string, limit = 15) {
  try {
    return await db.query.whatIfScenarios.findMany({
      where: eq(whatIfScenarios.workspaceId, workspaceId),
      orderBy: [desc(whatIfScenarios.createdAt)],
      limit,
    });
  } catch {
    return [];
  }
}
