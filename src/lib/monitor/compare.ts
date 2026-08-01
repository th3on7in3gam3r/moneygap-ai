import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  scoreSnapshots,
  type AnalysisComparisonChanges,
  type CategoryScores,
} from "@/db/schema";

function fingerprint(o: { title: string; moduleId: string | null }) {
  return `${(o.moduleId ?? "").toLowerCase()}::${o.title.trim().toLowerCase()}`;
}

function emptyCategoryScores(): CategoryScores {
  return {
    revenue: 0,
    authority: 0,
    seo: 0,
    content: 0,
    trust: 0,
    conversion: 0,
    marketing: 0,
    automation: 0,
    customer: 0,
    ai: 0,
    competitive: 0,
  };
}

export function diffCategoryScores(
  previous: CategoryScores | null | undefined,
  current: CategoryScores | null | undefined,
): Partial<Record<keyof CategoryScores, number>> {
  const prev = previous ?? emptyCategoryScores();
  const curr = current ?? emptyCategoryScores();
  const deltas: Partial<Record<keyof CategoryScores, number>> = {};
  for (const key of Object.keys(curr) as (keyof CategoryScores)[]) {
    const d = (curr[key] ?? 0) - (prev[key] ?? 0);
    if (d !== 0) deltas[key] = d;
  }
  return deltas;
}

export async function compareReports(input: {
  websiteId: string;
  currentReportId: string;
}): Promise<{
  previousReportId: string | null;
  scoreDelta: number;
  summary: string;
  changes: AnalysisComparisonChanges;
} | null> {
  const current = await db.query.reports.findFirst({
    where: eq(reports.id, input.currentReportId),
  });
  if (!current) return null;

  const previous = await db.query.reports.findFirst({
    where: and(
      eq(reports.websiteId, input.websiteId),
      eq(reports.type, "intelligence"),
      ne(reports.id, input.currentReportId),
    ),
    orderBy: [desc(reports.createdAt)],
  });

  const currentOps = await db.query.moneyGapOpportunities.findMany({
    where: eq(moneyGapOpportunities.reportId, input.currentReportId),
  });

  const previousOps = previous
    ? await db.query.moneyGapOpportunities.findMany({
        where: eq(moneyGapOpportunities.reportId, previous.id),
      })
    : [];

  const prevMap = new Map(previousOps.map((o) => [fingerprint(o), o]));
  const currMap = new Map(currentOps.map((o) => [fingerprint(o), o]));

  const newOpportunities = currentOps
    .filter((o) => !prevMap.has(fingerprint(o)))
    .map((o) => ({
      title: o.title,
      moduleId: o.moduleId,
      opportunityIndex: o.opportunityIndex,
    }));

  const resolved = previousOps
    .filter((o) => !currMap.has(fingerprint(o)))
    .map((o) => ({
      title: o.title,
      moduleId: o.moduleId,
    }));

  const categoryDeltas = diffCategoryScores(
    previous?.categoryScores as CategoryScores | null,
    current.categoryScores as CategoryScores | null,
  );

  const scoreDelta = current.moneyGapScore - (previous?.moneyGapScore ?? current.moneyGapScore);

  const reasons: string[] = [];
  if (previous) {
    if (scoreDelta < 0) {
      reasons.push(
        `MoneyGap Score™ improved by ${Math.abs(scoreDelta)} points (less uncaptured opportunity).`,
      );
    } else if (scoreDelta > 0) {
      reasons.push(`MoneyGap Score™ rose by ${scoreDelta} points (more opportunity detected).`);
    } else {
      reasons.push("MoneyGap Score™ held steady versus the previous analysis.");
    }
  } else {
    reasons.push("First intelligence baseline captured for this website.");
  }
  if (newOpportunities.length > 0) {
    reasons.push(`${newOpportunities.length} new opportunity(ies) detected.`);
  }
  if (resolved.length > 0) {
    reasons.push(`${resolved.length} previous gap(s) no longer detected.`);
  }

  const competitorNotes: string[] = [];
  if (current.competitiveBrief && previous?.competitiveBrief !== current.competitiveBrief) {
    competitorNotes.push("Competitive brief updated after re-analysis.");
  }

  const summary = previous
    ? `Score ${previous.moneyGapScore} → ${current.moneyGapScore} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta}). ${newOpportunities.length} new, ${resolved.length} resolved.`
    : `Baseline MoneyGap Score™ ${current.moneyGapScore} with ${currentOps.length} opportunities.`;

  return {
    previousReportId: previous?.id ?? null,
    scoreDelta,
    summary,
    changes: {
      newOpportunities,
      resolved,
      categoryDeltas,
      competitorNotes,
      reasons,
    },
  };
}

export async function getLatestSnapshot(websiteId: string) {
  return db.query.scoreSnapshots.findFirst({
    where: eq(scoreSnapshots.websiteId, websiteId),
    orderBy: [desc(scoreSnapshots.createdAt)],
  });
}

/** Soft helper for SQL count when drizzle query API is awkward */
export async function countSnapshots(websiteId: string) {
  const result = await db.execute(
    sql`select count(*)::int as c from score_snapshots where website_id = ${websiteId}`,
  );
  const row = (result as unknown as { rows?: { c: number }[] }).rows?.[0];
  return row?.c ?? 0;
}
