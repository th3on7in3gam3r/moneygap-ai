import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  assignProject,
  linkProjectSprint,
  loadTeamContext,
  requireTeamFeature,
} from "@/lib/team";

const patchSchema = z.object({
  projectId: z.string().uuid(),
  assigneeUserId: z.string().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
});

export async function PATCH(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error }, { status: feature.status });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const ctx = await loadTeamContext();
  let project = null;

  if (parsed.data.assigneeUserId !== undefined) {
    const result = await assignProject({
      ctx,
      projectId: parsed.data.projectId,
      assigneeUserId: parsed.data.assigneeUserId,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    project = result.project;
  }

  if (parsed.data.sprintId !== undefined) {
    const result = await linkProjectSprint({
      ctx,
      projectId: parsed.data.projectId,
      sprintId: parsed.data.sprintId,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    project = result.project;
  }

  return Response.json({ project });
}
