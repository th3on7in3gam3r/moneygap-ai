import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  moneyGapOpportunities,
  reports,
  scoreSnapshots,
  type CategoryScores,
} from "@/db/schema";

export async function writeScoreSnapshot(input: {
  websiteId: string;
  reportId: string;
}) {
  const report = await db.query.reports.findFirst({
    where: eq(reports.id, input.reportId),
  });
  if (!report) return null;

  const completed = await db.query.moneyGapOpportunities.findMany({
    where: and(
      eq(moneyGapOpportunities.reportId, input.reportId),
      inArray(moneyGapOpportunities.lifecycleStatus, [
        "completed",
        "improved",
        "resolved",
      ]),
    ),
  });

  const capturedOpportunity = completed.reduce(
    (sum, o) => sum + (o.estimatedAnnualRevenue ?? 0),
    0,
  );

  const [row] = await db
    .insert(scoreSnapshots)
    .values({
      websiteId: input.websiteId,
      reportId: input.reportId,
      moneyGapScore: report.moneyGapScore,
      categoryScores: (report.categoryScores as CategoryScores) ?? null,
      revenueAtRisk: report.revenueAtRisk,
      capturePotential: report.capturePotential,
      capturedOpportunity,
    })
    .returning();

  return row;
}
