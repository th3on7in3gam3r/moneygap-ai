import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  developerBlueprints,
  developerImplementationPlans,
  developerPrDrafts,
  moneyGapOpportunities,
} from "@/db/schema";
import { writeDeveloperAudit } from "@/lib/developer/audit";
import { generateAllBlueprints } from "@/lib/developer/blueprints";
import { getTechProfile } from "@/lib/developer/memory";
import { buildImplementationPlan } from "@/lib/developer/planner";
import { listDeveloperRepos } from "@/lib/developer/repo-intel";
import { getProviderCredentials } from "@/lib/integrations";

export async function getDeveloperModeOverview(workspaceId: string) {
  const github = await getProviderCredentials(workspaceId, "github");
  const [repos, techProfile, plans, prDrafts] = await Promise.all([
    listDeveloperRepos(workspaceId),
    getTechProfile(workspaceId),
    db.query.developerImplementationPlans.findMany({
      where: eq(developerImplementationPlans.workspaceId, workspaceId),
      orderBy: [desc(developerImplementationPlans.createdAt)],
      limit: 30,
    }),
    db.query.developerPrDrafts.findMany({
      where: eq(developerPrDrafts.workspaceId, workspaceId),
      orderBy: [desc(developerPrDrafts.createdAt)],
      limit: 20,
    }),
  ]);

  return {
    githubConnected: Boolean(github),
    hubCta: github
      ? null
      : "Connect GitHub in Integration Hub to sync repositories.",
    techProfile: techProfile
      ? {
          id: techProfile.id,
          stack: techProfile.stack,
          confidence: techProfile.confidence,
          sourceRepoId: techProfile.sourceRepoId,
          version: techProfile.version,
          updatedAt: techProfile.updatedAt.toISOString(),
        }
      : null,
    repos: repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      defaultBranch: r.defaultBranch,
      htmlUrl: r.htmlUrl,
      isPrimary: r.isPrimary,
      status: r.status,
      lastAnalyzedAt: r.lastAnalyzedAt?.toISOString() ?? null,
      meta: r.meta,
    })),
    plans: plans.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      opportunityId: p.opportunityId,
      reportId: p.reportId,
      repoId: p.repoId,
      riskLevel: p.plan.riskLevel,
      estimatedTime: p.plan.estimatedTime,
      createdAt: p.createdAt.toISOString(),
    })),
    prDrafts: prDrafts.map((d) => ({
      id: d.id,
      planId: d.planId,
      repoId: d.repoId,
      branchName: d.branchName,
      prUrl: d.prUrl,
      prNumber: d.prNumber,
      status: d.status,
      riskSummary: d.riskSummary,
      authorizedAt: d.authorizedAt.toISOString(),
    })),
  };
}

export async function createDeveloperPlan(input: {
  workspaceId: string;
  userId: string;
  opportunityId?: string | null;
  reportId?: string | null;
  title?: string | null;
  repoId?: string | null;
}) {
  const tech = await getTechProfile(input.workspaceId);
  const repos = await listDeveloperRepos(input.workspaceId);
  const primary =
    repos.find((r) => r.id === input.repoId) ||
    repos.find((r) => r.isPrimary) ||
    repos[0] ||
    null;

  type Opp = NonNullable<
    Awaited<ReturnType<typeof db.query.moneyGapOpportunities.findFirst>>
  >;
  let opportunity: Opp | null = null;
  if (input.opportunityId) {
    opportunity =
      (await db.query.moneyGapOpportunities.findFirst({
        where: eq(moneyGapOpportunities.id, input.opportunityId),
      })) ?? null;
  }

  const title =
    input.title?.trim() ||
    opportunity?.title ||
    "Implementation plan";

  const planJson = buildImplementationPlan({
    opportunity: {
      title,
      category: opportunity?.category,
      whatsMissing: opportunity?.whatsMissing,
      summary: opportunity?.summary,
      moduleId: opportunity?.moduleId,
    },
    stack: tech?.stack ?? null,
  });

  const [row] = await db
    .insert(developerImplementationPlans)
    .values({
      workspaceId: input.workspaceId,
      opportunityId: opportunity?.id ?? input.opportunityId ?? null,
      reportId: opportunity?.reportId ?? input.reportId ?? null,
      repoId: primary?.id ?? null,
      title,
      plan: planJson,
      status: "ready",
      createdByUserId: input.userId,
    })
    .returning();

  await writeDeveloperAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "developer_plan_create",
    planId: row!.id,
    repoId: primary?.id ?? null,
    meta: { title, riskLevel: planJson.riskLevel },
  });

  return row!;
}

export async function getDeveloperPlanDetail(
  workspaceId: string,
  planId: string,
) {
  const plan = await db.query.developerImplementationPlans.findFirst({
    where: and(
      eq(developerImplementationPlans.id, planId),
      eq(developerImplementationPlans.workspaceId, workspaceId),
    ),
  });
  if (!plan) return null;

  const [blueprints, prDrafts, tech] = await Promise.all([
    db.query.developerBlueprints.findMany({
      where: eq(developerBlueprints.planId, planId),
    }),
    db.query.developerPrDrafts.findMany({
      where: eq(developerPrDrafts.planId, planId),
      orderBy: [desc(developerPrDrafts.createdAt)],
    }),
    getTechProfile(workspaceId),
  ]);

  return { plan, blueprints, prDrafts, techProfile: tech };
}

export async function generatePlanBlueprints(input: {
  workspaceId: string;
  userId: string;
  planId: string;
}) {
  const detail = await getDeveloperPlanDetail(input.workspaceId, input.planId);
  if (!detail) {
    return { ok: false as const, error: "Plan not found", status: 404 as const };
  }

  const generated = generateAllBlueprints({
    planTitle: detail.plan.title,
    plan: detail.plan.plan,
    stack: detail.techProfile?.stack ?? null,
  });

  await db
    .delete(developerBlueprints)
    .where(eq(developerBlueprints.planId, input.planId));

  const rows = await db
    .insert(developerBlueprints)
    .values(
      generated.map((g) => ({
        planId: input.planId,
        tool: g.tool,
        title: g.title,
        body: g.body,
        meta: g.meta,
      })),
    )
    .returning();

  await writeDeveloperAudit({
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "developer_blueprints_generate",
    planId: input.planId,
    meta: { count: rows.length },
  });

  return { ok: true as const, blueprints: rows };
}
