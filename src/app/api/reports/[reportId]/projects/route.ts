import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  actionProjects,
  actionProjectTasks,
  moneyGapOpportunities,
} from "@/db/schema";
import { checklistForPlaybook } from "@/lib/advisor/checklists";
import { assertReportAccess } from "@/lib/advisor/context";
import { resolvePlaybook, type PlaybookId } from "@/lib/advisor/playbooks";

export async function GET(
  _req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const projects = await db.query.actionProjects.findMany({
    where: eq(actionProjects.reportId, reportId),
    with: { tasks: true, opportunity: true },
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  return Response.json({ projects });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const { requireFeature, upgradeResponse } = await import("@/lib/billing");
  const gate = await requireFeature(access.report.workspaceId, "action_center");
  if (!gate.ok) return upgradeResponse(gate);

  const body = (await req.json()) as {
    opportunityId?: string;
    playbook?: PlaybookId;
    title?: string;
  };

  if (!body.opportunityId) {
    return Response.json({ error: "opportunityId required" }, { status: 400 });
  }

  const opportunity = await db.query.moneyGapOpportunities.findFirst({
    where: and(
      eq(moneyGapOpportunities.id, body.opportunityId),
      eq(moneyGapOpportunities.reportId, reportId),
    ),
  });
  if (!opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const playbook =
    body.playbook ??
    resolvePlaybook({
      moduleId: opportunity.moduleId,
      title: opportunity.title,
      category: opportunity.category,
      whatsMissing: opportunity.whatsMissing,
    });

  const checklist = checklistForPlaybook(playbook);

  const [project] = await db
    .insert(actionProjects)
    .values({
      reportId,
      opportunityId: opportunity.id,
      userId,
      title: body.title || `Project: ${opportunity.title}`,
      status: "active",
      priority: opportunity.severity,
      progress: 0,
      businessImpact: opportunity.businessImpact,
      estimatedCompletion: opportunity.estimatedTime,
      playbook,
    })
    .returning();

  await db.insert(actionProjectTasks).values(
    checklist.map((title, index) => ({
      projectId: project.id,
      title,
      sortOrder: index,
      completed: false,
    })),
  );

  await db
    .update(moneyGapOpportunities)
    .set({
      implementationStatus: "in_progress",
      lifecycleStatus: "in_progress",
      status: "in_progress",
    })
    .where(eq(moneyGapOpportunities.id, opportunity.id));

  const full = await db.query.actionProjects.findFirst({
    where: eq(actionProjects.id, project.id),
    with: { tasks: true },
  });

  return Response.json({ project: full });
}
