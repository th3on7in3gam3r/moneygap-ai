import { db } from "@/db";
import { notifications } from "@/db/schema";
import type { AnalysisComparisonChanges } from "@/db/schema";

export async function notifyWorkspaceUsers(input: {
  userIds: string[];
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  if (input.userIds.length === 0) return [];
  const rows = await db
    .insert(notifications)
    .values(
      input.userIds.map((userId) => ({
        userId,
        workspaceId: input.workspaceId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
      })),
    )
    .returning();
  return rows;
}

export async function notifyFromComparison(input: {
  userIds: string[];
  workspaceId: string;
  websiteName: string;
  reportId: string;
  scoreDelta: number;
  changes: AnalysisComparisonChanges;
  resolvedCount: number;
}) {
  const href = `/reports/${input.reportId}`;
  const created = [];

  if (input.scoreDelta < 0) {
    created.push(
      ...(await notifyWorkspaceUsers({
        userIds: input.userIds,
        workspaceId: input.workspaceId,
        type: "score_improved",
        title: `Score improved · ${input.websiteName}`,
        body: `MoneyGap Score™ dropped by ${Math.abs(input.scoreDelta)} points — less uncaptured opportunity.`,
        href,
      })),
    );
  } else if (input.scoreDelta > 0) {
    created.push(
      ...(await notifyWorkspaceUsers({
        userIds: input.userIds,
        workspaceId: input.workspaceId,
        type: "score_increased",
        title: `New opportunity signal · ${input.websiteName}`,
        body: `MoneyGap Score™ rose by ${input.scoreDelta} points after re-analysis.`,
        href,
      })),
    );
  }

  if (input.changes.newOpportunities.length > 0) {
    const top = input.changes.newOpportunities
      .slice(0, 3)
      .map((o) => o.title)
      .join("; ");
    created.push(
      ...(await notifyWorkspaceUsers({
        userIds: input.userIds,
        workspaceId: input.workspaceId,
        type: "new_opportunities",
        title: `${input.changes.newOpportunities.length} new gap(s) · ${input.websiteName}`,
        body: top || "New Money Gaps detected on re-analysis.",
        href,
      })),
    );
  }

  if (input.resolvedCount > 0 || input.changes.resolved.length > 0) {
    created.push(
      ...(await notifyWorkspaceUsers({
        userIds: input.userIds,
        workspaceId: input.workspaceId,
        type: "gaps_resolved",
        title: `Gaps closing · ${input.websiteName}`,
        body: `${input.resolvedCount || input.changes.resolved.length} previous opportunity(ies) no longer detected.`,
        href,
      })),
    );
  }

  return created;
}
