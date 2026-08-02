import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  selfOptimizationFindings,
  selfOptimizationScans,
  selfOptimizationScores,
} from "@/db/schema";

type ScanRow = typeof selfOptimizationScans.$inferSelect;
type ScoreRow = typeof selfOptimizationScores.$inferSelect;
type ScanWithScores = ScanRow & { scores: ScoreRow | null };

async function attachScores(scans: ScanRow[]): Promise<ScanWithScores[]> {
  if (scans.length === 0) return [];
  const scores = await db
    .select()
    .from(selfOptimizationScores)
    .where(
      inArray(
        selfOptimizationScores.scanId,
        scans.map((s) => s.id),
      ),
    );
  const byScan = new Map(scores.map((s) => [s.scanId, s]));
  return scans.map((s) => ({ ...s, scores: byScan.get(s.id) ?? null }));
}

export async function getScanSummaries(workspaceId: string) {
  const scanRows = await db
    .select()
    .from(selfOptimizationScans)
    .where(eq(selfOptimizationScans.workspaceId, workspaceId))
    .orderBy(desc(selfOptimizationScans.createdAt))
    .limit(90);

  const scans = await attachScores(scanRows);

  const now = Date.now();
  const dayAgo = new Date(now - 86400000);
  const weekAgo = new Date(now - 7 * 86400000);
  const monthAgo = new Date(now - 30 * 86400000);

  const completed = scans.filter(
    (s) => s.status === "completed" || s.status === "partial",
  );
  const latest = completed[0] ?? null;
  const prev = completed[1] ?? null;
  const latestAny = scans[0] ?? null;

  const daily = completed.filter((s) => s.createdAt >= dayAgo);
  const weekly = completed.filter((s) => s.createdAt >= weekAgo);
  const monthly = completed.filter((s) => s.createdAt >= monthAgo);

  const scoreDelta = (key: keyof ScoreRow) => {
    if (!latest?.scores || !prev?.scores) return null;
    const a = latest.scores[key];
    const b = prev.scores[key];
    if (typeof a !== "number" || typeof b !== "number") return null;
    return a - b;
  };

  let topFindings: (typeof selfOptimizationFindings.$inferSelect)[] = [];
  if (latest) {
    topFindings = await db
      .select()
      .from(selfOptimizationFindings)
      .where(eq(selfOptimizationFindings.scanId, latest.id))
      .orderBy(desc(selfOptimizationFindings.estimatedOpportunity))
      .limit(10);
  }

  return {
    latest,
    latestAny,
    trend: completed
      .slice(0, 30)
      .reverse()
      .map((s) => ({
        date: s.createdAt.toISOString(),
        overall: s.scores?.overall ?? null,
        seo: s.scores?.seo ?? null,
        trust: s.scores?.trust ?? null,
        conversion: s.scores?.conversion ?? null,
        crawlability: s.scores?.crawlability ?? null,
      })),
    dailyCount: daily.length,
    weeklyCount: weekly.length,
    monthlyCount: monthly.length,
    deltas: {
      overall: scoreDelta("overall"),
      seo: scoreDelta("seo"),
      trust: scoreDelta("trust"),
      conversion: scoreDelta("conversion"),
      crawlability: scoreDelta("crawlability"),
    },
    crawlability: latest?.scores
      ? {
          score: latest.scores.crawlability,
          status: latest.scores.crawlabilityStatus,
          contributors: latest.scores.crawlabilityContributors,
          summary: latest.scores.crawlabilitySummary,
          estimatedImprovement: latest.scores.crawlabilityEstimatedImprovement,
          previous: prev?.scores?.crawlability ?? null,
          delta: scoreDelta("crawlability"),
        }
      : null,
    topFindings,
    resolvedHint:
      prev && latest
        ? "Compare latest vs previous scan findings to spot resolved issues (titles that no longer appear)."
        : "Need at least two completed scans for resolved-issue trends.",
  };
}

export async function listScansSince(workspaceId: string, since: Date) {
  const scanRows = await db
    .select()
    .from(selfOptimizationScans)
    .where(
      and(
        eq(selfOptimizationScans.workspaceId, workspaceId),
        gte(selfOptimizationScans.createdAt, since),
      ),
    )
    .orderBy(desc(selfOptimizationScans.createdAt));
  return attachScores(scanRows);
}

export async function getLatestScores(workspaceId: string) {
  const completed = await db
    .select()
    .from(selfOptimizationScans)
    .where(
      and(
        eq(selfOptimizationScans.workspaceId, workspaceId),
        eq(selfOptimizationScans.status, "completed"),
      ),
    )
    .orderBy(desc(selfOptimizationScans.createdAt))
    .limit(1);

  const scan =
    completed[0] ??
    (
      await db
        .select()
        .from(selfOptimizationScans)
        .where(eq(selfOptimizationScans.workspaceId, workspaceId))
        .orderBy(desc(selfOptimizationScans.createdAt))
        .limit(1)
    )[0];

  if (!scan) return null;

  const scores = await db
    .select()
    .from(selfOptimizationScores)
    .where(eq(selfOptimizationScores.scanId, scan.id))
    .limit(1);
  return scores[0] ?? null;
}
