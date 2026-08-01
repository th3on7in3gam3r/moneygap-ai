import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { moneyGapOpportunities } from "@/db/schema";
import { implementationFromLifecycle } from "@/lib/monitor/lifecycle";
import type { AnalysisComparisonChanges } from "@/db/schema";

function fingerprint(o: { title: string; moduleId: string | null }) {
  return `${(o.moduleId ?? "").toLowerCase()}::${o.title.trim().toLowerCase()}`;
}

/**
 * When a gap from the previous report is no longer detected on the current report,
 * mark matching open opportunities on the previous report as resolved (soft carry).
 * Also marks matching titles on the current report's sibling history if needed.
 */
export async function resolveGapsNoLongerDetected(input: {
  previousReportId: string | null;
  currentReportId: string;
  changes: AnalysisComparisonChanges;
}) {
  if (!input.previousReportId || input.changes.resolved.length === 0) {
    return { resolvedCount: 0 };
  }

  const previousOps = await db.query.moneyGapOpportunities.findMany({
    where: and(
      eq(moneyGapOpportunities.reportId, input.previousReportId),
      ne(moneyGapOpportunities.lifecycleStatus, "resolved"),
    ),
  });

  const resolvedFingerprints = new Set(
    input.changes.resolved.map((r) => fingerprint(r)),
  );

  const toResolve = previousOps.filter((o) =>
    resolvedFingerprints.has(fingerprint(o)),
  );

  if (toResolve.length === 0) return { resolvedCount: 0 };

  await db
    .update(moneyGapOpportunities)
    .set({
      lifecycleStatus: "resolved",
      implementationStatus: implementationFromLifecycle("resolved"),
      status: "resolved",
      completedAt: new Date(),
    })
    .where(
      inArray(
        moneyGapOpportunities.id,
        toResolve.map((o) => o.id),
      ),
    );

  return { resolvedCount: toResolve.length };
}

export async function syncLifecycleFromImplementation(
  opportunityId: string,
  implementationStatus: string,
) {
  const { lifecycleFromImplementation } = await import("@/lib/monitor/lifecycle");
  const lifecycleStatus = lifecycleFromImplementation(implementationStatus);
  await db
    .update(moneyGapOpportunities)
    .set({ lifecycleStatus })
    .where(eq(moneyGapOpportunities.id, opportunityId));
  return lifecycleStatus;
}
