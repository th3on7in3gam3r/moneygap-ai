import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { actionProjects } from "@/db/schema";
import { assertReportAccess } from "@/lib/advisor/context";
import {
  addDependency,
  listDependenciesForReport,
  removeDependency,
} from "@/lib/growth-os/dependencies";

export async function GET(
  _req: Request,
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
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const { projects, deps } = await listDependenciesForReport(reportId);
  const mine = deps.filter((d) => d.projectId === id);
  return Response.json({
    dependencies: mine,
    projects: projects.map((p) => ({ id: p.id, title: p.title, status: p.status })),
  });
}

const bodySchema = z.object({
  dependsOnProjectId: z.string().uuid(),
});

export async function POST(
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
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "dependsOnProjectId required" }, { status: 400 });
  }

  const dependsOn = await db.query.actionProjects.findFirst({
    where: and(
      eq(actionProjects.id, parsed.data.dependsOnProjectId),
      eq(actionProjects.reportId, reportId),
    ),
  });
  if (!dependsOn) {
    return Response.json({ error: "Dependency project not found" }, { status: 404 });
  }

  try {
    const dep = await addDependency({
      projectId: id,
      dependsOnProjectId: parsed.data.dependsOnProjectId,
    });
    return Response.json({ dependency: dep }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not add dependency" },
      { status: 400 },
    );
  }
}

export async function DELETE(
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

  const url = new URL(req.url);
  const depId = url.searchParams.get("dependencyId");
  if (!depId) {
    return Response.json({ error: "dependencyId required" }, { status: 400 });
  }

  void id;
  await removeDependency(depId);
  return Response.json({ ok: true });
}
