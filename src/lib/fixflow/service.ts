import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  fixflowProposals,
  moneyGapOpportunities,
  reports,
  type OpportunityFix,
} from "@/db/schema";
import { getTechProfile } from "@/lib/developer/memory";
import { createHeuristicFixAgent } from "@/lib/fixflow/agents/fix-agent";
import {
  buildFixProposal,
  buildProposalDiffPreview,
  preparePrPayload,
  type ProposalOpportunityInput,
} from "@/lib/fixflow/proposals";
import { canCreatePr } from "@/lib/fixflow/validators/safety";
import type { DiffPreview, FixFlowStatus, FixProposalRecord } from "@/lib/fixflow/types";

function toRecord(
  row: typeof fixflowProposals.$inferSelect,
): FixProposalRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    opportunityId: row.opportunityId,
    reportId: row.reportId,
    repoId: row.repoId,
    planId: row.planId,
    status: row.status,
    title: row.title,
    proposal: row.proposal as FixProposalRecord["proposal"],
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedByUserId: row.approvedByUserId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadOpportunityForWorkspace(
  workspaceId: string,
  opportunityId: string,
): Promise<ProposalOpportunityInput | null> {
  const opp = await db.query.moneyGapOpportunities.findFirst({
    where: eq(moneyGapOpportunities.id, opportunityId),
  });
  if (!opp) return null;
  const report = await db.query.reports.findFirst({
    where: eq(reports.id, opp.reportId),
  });
  if (!report || report.workspaceId !== workspaceId) return null;

  return {
    id: opp.id,
    reportId: opp.reportId,
    title: opp.title,
    category: opp.category,
    moduleId: opp.moduleId,
    summary: opp.summary,
    whatsMissing: opp.whatsMissing,
    whyItMatters: opp.whyItMatters,
    businessImpact: opp.businessImpact,
    estimatedAnnualRevenue: opp.estimatedAnnualRevenue,
    estimatedTime: opp.estimatedTime,
    difficulty: opp.difficulty,
    opportunityIndex: opp.opportunityIndex,
    fixes: (opp.fixes ?? []) as OpportunityFix[],
  };
}

export async function createFixflowProposal(input: {
  workspaceId: string;
  userId: string;
  opportunityId: string;
  repoId?: string | null;
}) {
  const opportunity = await loadOpportunityForWorkspace(
    input.workspaceId,
    input.opportunityId,
  );
  if (!opportunity) {
    throw new Error("Opportunity not found in this workspace");
  }

  const profile = await getTechProfile(input.workspaceId);
  const body = buildFixProposal({
    opportunity,
    stack: profile?.stack ?? null,
  });
  const diffPreview = await buildProposalDiffPreview(body);

  const [row] = await db
    .insert(fixflowProposals)
    .values({
      workspaceId: input.workspaceId,
      opportunityId: opportunity.id,
      reportId: opportunity.reportId,
      repoId: input.repoId ?? null,
      title: body.issue,
      status: "draft",
      proposal: body,
      diffPreview,
      createdByUserId: input.userId,
    })
    .returning();

  return { record: toRecord(row!), diffPreview };
}

export async function getFixflowProposal(input: {
  workspaceId: string;
  id: string;
}) {
  const row = await db.query.fixflowProposals.findFirst({
    where: and(
      eq(fixflowProposals.id, input.id),
      eq(fixflowProposals.workspaceId, input.workspaceId),
    ),
  });
  if (!row) return null;
  return {
    record: toRecord(row),
    diffPreview: (row.diffPreview as DiffPreview | null) ?? null,
  };
}

export async function listFixflowProposalsForOpportunity(input: {
  workspaceId: string;
  opportunityId: string;
}) {
  const rows = await db.query.fixflowProposals.findMany({
    where: and(
      eq(fixflowProposals.workspaceId, input.workspaceId),
      eq(fixflowProposals.opportunityId, input.opportunityId),
    ),
    orderBy: [desc(fixflowProposals.createdAt)],
    limit: 20,
  });
  return rows.map(toRecord);
}

export async function updateFixflowProposalStatus(input: {
  workspaceId: string;
  userId: string;
  id: string;
  action: "approve" | "reject";
}) {
  const existing = await getFixflowProposal({
    workspaceId: input.workspaceId,
    id: input.id,
  });
  if (!existing) throw new Error("Proposal not found");

  const next: FixFlowStatus =
    input.action === "approve" ? "approved" : "rejected";

  const [row] = await db
    .update(fixflowProposals)
    .set({
      status: next,
      approvedAt: input.action === "approve" ? new Date() : null,
      approvedByUserId: input.action === "approve" ? input.userId : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(fixflowProposals.id, input.id),
        eq(fixflowProposals.workspaceId, input.workspaceId),
      ),
    )
    .returning();

  return toRecord(row!);
}

export async function getFixflowPrReadiness(input: {
  workspaceId: string;
  id: string;
}) {
  const loaded = await getFixflowProposal(input);
  if (!loaded) return null;

  let diff = loaded.diffPreview;
  if (!diff || diff.empty) {
    const agent = createHeuristicFixAgent();
    diff = await agent.produceDiffs({ proposal: loaded.record.proposal });
  }

  const gate = canCreatePr({
    status: loaded.record.status,
    proposal: loaded.record.proposal,
    diffPreview: diff,
  });

  const payload = preparePrPayload({
    proposal: loaded.record.proposal,
    title: `FixFlow: ${loaded.record.title}`,
  });

  return {
    canCreatePr: gate.ok,
    reasons: gate.reasons,
    preparePrPayload: payload,
    developerModeHint:
      "/dashboard/developer-mode — create an implementation plan and authorized draft PR after approval.",
  };
}
