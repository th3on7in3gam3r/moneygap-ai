import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { actionProjects, actionProjectTasks } from "@/db/schema";
import { assertReportAccess } from "@/lib/advisor/context";

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ reportId: string; id: string; taskId: string }>;
  },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId, id, taskId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const project = await db.query.actionProjects.findFirst({
    where: and(eq(actionProjects.id, id), eq(actionProjects.reportId, reportId)),
  });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json()) as { completed?: boolean };
  if (typeof body.completed !== "boolean") {
    return Response.json({ error: "completed boolean required" }, { status: 400 });
  }

  await db
    .update(actionProjectTasks)
    .set({
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
    })
    .where(
      and(eq(actionProjectTasks.id, taskId), eq(actionProjectTasks.projectId, id)),
    );

  const tasks = await db.query.actionProjectTasks.findMany({
    where: eq(actionProjectTasks.projectId, id),
  });
  const done = tasks.filter((t) => t.completed).length;
  const progress =
    tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  await db
    .update(actionProjects)
    .set({
      progress,
      status: progress === 100 ? "completed" : project.status === "completed" ? "active" : project.status,
      updatedAt: new Date(),
    })
    .where(eq(actionProjects.id, id));

  const full = await db.query.actionProjects.findFirst({
    where: eq(actionProjects.id, id),
    with: { tasks: true },
  });

  return Response.json({ project: full });
}
