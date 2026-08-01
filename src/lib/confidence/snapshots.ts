import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  workspaceConfidenceSnapshots,
  type ConfidenceIntelJson,
  type ConfidenceSnapshotBreakdown,
} from "@/db/schema";

export async function createConfidenceSnapshot(input: {
  workspaceId: string;
  reportId?: string | null;
  payloads: ConfidenceIntelJson[];
}) {
  if (input.payloads.length === 0) return null;

  const n = input.payloads.length;
  const engines = {
    business: 0,
    developer: 0,
    data: 0,
    benchmark: 0,
    ai: 0,
  };
  let overallSum = 0;
  let low = 0;
  const riskDistribution = { low: 0, medium: 0, high: 0 };

  for (const p of input.payloads) {
    overallSum += p.overall;
    engines.business += p.engines.business;
    engines.developer += p.engines.developer;
    engines.data += p.engines.data;
    engines.benchmark += p.engines.benchmark;
    engines.ai += p.engines.ai;
    if (p.overall < 55) low += 1;
    riskDistribution[p.risk.level] += 1;
  }

  const breakdown: ConfidenceSnapshotBreakdown = {
    engines: {
      business: Math.round(engines.business / n),
      developer: Math.round(engines.developer / n),
      data: Math.round(engines.data / n),
      benchmark: Math.round(engines.benchmark / n),
      ai: Math.round(engines.ai / n),
    },
    riskDistribution,
    recommendationCount: n,
  };

  const [row] = await db
    .insert(workspaceConfidenceSnapshots)
    .values({
      workspaceId: input.workspaceId,
      reportId: input.reportId ?? null,
      overallScore: Math.round(overallSum / n),
      breakdown,
      lowConfidenceCount: low,
    })
    .returning();

  return row!;
}

export async function listConfidenceSnapshots(
  workspaceId: string,
  limit = 30,
) {
  return db.query.workspaceConfidenceSnapshots.findMany({
    where: eq(workspaceConfidenceSnapshots.workspaceId, workspaceId),
    orderBy: [desc(workspaceConfidenceSnapshots.createdAt)],
    limit,
  });
}

export async function getLatestConfidenceSnapshot(workspaceId: string) {
  const rows = await listConfidenceSnapshots(workspaceId, 1);
  return rows[0] ?? null;
}
