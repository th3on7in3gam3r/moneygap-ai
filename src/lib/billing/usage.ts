import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  usageEvents,
  usagePeriods,
  type UsagePeriodCounters,
} from "@/db/schema";
import { getPlanDefinition } from "@/lib/billing/catalog";
import { usageLimitMessage } from "@/lib/billing/messages";

export type UsageType =
  | "website_analysis"
  | "ai_generation"
  | "report_created"
  | "competitor_analysis"
  | "export"
  | "api_call";

function emptyCounters(): UsagePeriodCounters {
  return {
    website_analysis: 0,
    ai_generation: 0,
    report_created: 0,
    competitor_analysis: 0,
    export: 0,
    api_call: 0,
  };
}

export function currentPeriodBounds(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

export async function getOrCreateUsagePeriod(workspaceId: string) {
  const { periodStart, periodEnd } = currentPeriodBounds();
  const existing = await db.query.usagePeriods.findFirst({
    where: and(
      eq(usagePeriods.workspaceId, workspaceId),
      eq(usagePeriods.periodStart, periodStart),
    ),
  });
  if (existing) return existing;

  const [row] = await db
    .insert(usagePeriods)
    .values({
      workspaceId,
      periodStart,
      periodEnd,
      counters: emptyCounters(),
    })
    .returning();
  return row;
}

export async function getCurrentPeriodUsage(workspaceId: string) {
  const period = await getOrCreateUsagePeriod(workspaceId);
  return {
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    counters: period.counters ?? emptyCounters(),
  };
}

export async function recordUsage(input: {
  workspaceId: string;
  userId?: string | null;
  type: UsageType;
  quantity?: number;
  meta?: Record<string, unknown>;
}) {
  try {
    const quantity = input.quantity ?? 1;
    await db.insert(usageEvents).values({
      workspaceId: input.workspaceId,
      userId: input.userId ?? null,
      type: input.type,
      quantity,
      meta: input.meta ?? null,
    });

    const period = await getOrCreateUsagePeriod(input.workspaceId);
    const counters = { ...(period.counters ?? emptyCounters()) };
    counters[input.type] = (counters[input.type] ?? 0) + quantity;
    await db
      .update(usagePeriods)
      .set({ counters, updatedAt: new Date() })
      .where(eq(usagePeriods.id, period.id));
  } catch (err) {
    console.error("recordUsage soft-fail:", err);
  }
}

function limitForType(planId: string, type: UsageType): number {
  const limits = getPlanDefinition(planId).limits;
  switch (type) {
    case "website_analysis":
      return limits.analysesPerMonth;
    case "ai_generation":
      return limits.aiGenerationsPerMonth;
    case "report_created":
      return limits.reportsPerMonth;
    case "competitor_analysis":
      return limits.competitorAnalysesPerMonth;
    case "export":
      return limits.exportsPerMonth;
    case "api_call":
      return limits.apiCallsPerMonth;
    default:
      return 0;
  }
}

export async function assertWithinLimit(input: {
  workspaceId: string;
  planId: string;
  type: UsageType;
  quantity?: number;
}): Promise<
  | { ok: true }
  | { ok: false; code: "usage_limit"; message: string; limit: number; used: number }
> {
  const usage = await getCurrentPeriodUsage(input.workspaceId);
  const used = usage.counters[input.type] ?? 0;
  const limit = limitForType(input.planId, input.type);
  const next = used + (input.quantity ?? 1);
  if (next > limit) {
    return {
      ok: false,
      code: "usage_limit",
      message: usageLimitMessage(input.type),
      limit,
      used,
    };
  }
  return { ok: true };
}

/** Helper for period queries if needed */
export async function countEventsInPeriod(
  workspaceId: string,
  type: UsageType,
) {
  const { periodStart, periodEnd } = currentPeriodBounds();
  const rows = await db.query.usageEvents.findMany({
    where: and(
      eq(usageEvents.workspaceId, workspaceId),
      eq(usageEvents.type, type),
      gte(usageEvents.createdAt, periodStart),
      lt(usageEvents.createdAt, periodEnd),
    ),
  });
  return rows.reduce((s, r) => s + r.quantity, 0);
}
