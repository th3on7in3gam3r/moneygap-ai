import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { actionProjects, actionProjectTasks } from "@/db/schema";
import { assertReportAccess } from "@/lib/advisor/context";
import { trackProductMetric } from "@/lib/observability/metrics";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ reportId: string; id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId, id } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const project = await db.query.actionProjects.findFirst({
    where: and(eq(actionProjects.id, id), eq(actionProjects.reportId, reportId)),
    with: { tasks: true },
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json()) as {
    status?: "active" | "paused" | "completed" | "archived";
    title?: string;
    assigneeUserId?: string | null;
    deadline?: string | null;
    clientNotes?: string | null;
  };

  let progress = project.progress;
  if (body.status === "completed") {
    progress = 100;
    await db
      .update(actionProjectTasks)
      .set({ completed: true, completedAt: new Date() })
      .where(eq(actionProjectTasks.projectId, id));
  }

  const [updated] = await db
    .update(actionProjects)
    .set({
      ...(body.status ? { status: body.status } : {}),
      ...(body.title ? { title: body.title } : {}),
      ...(body.assigneeUserId !== undefined
        ? { assigneeUserId: body.assigneeUserId }
        : {}),
      ...(body.deadline !== undefined
        ? { deadline: body.deadline ? new Date(body.deadline) : null }
        : {}),
      ...(body.clientNotes !== undefined ? { clientNotes: body.clientNotes } : {}),
      progress,
      updatedAt: new Date(),
    })
    .where(eq(actionProjects.id, id))
    .returning();

  const full = await db.query.actionProjects.findFirst({
    where: eq(actionProjects.id, updated.id),
    with: { tasks: true },
  });

  if (body.status === "completed" && project.status !== "completed") {
    await trackProductMetric({
      type: "project_completed",
      workspaceId: access.report.workspaceId,
      meta: { projectId: id },
    });
    try {
      const { recordTimelineEvent } = await import("@/lib/growth-os/timeline");
      const { evaluateAchievements } = await import("@/lib/growth-os/achievements");
      await recordTimelineEvent({
        workspaceId: access.report.workspaceId,
        type: "project_completed",
        title: project.title,
        body: "Action Project™ completed",
        meta: { projectId: id },
      });
      await evaluateAchievements(access.report.workspaceId);
    } catch {
      // soft-fail
    }
  }

  return Response.json({ project: full });
}
