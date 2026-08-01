import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { canManageDeveloperMode, createDeveloperPlan } from "@/lib/developer";

const bodySchema = z.object({
  opportunityId: z.string().uuid().optional().nullable(),
  reportId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200).optional().nullable(),
  repoId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const plan = await createDeveloperPlan({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      opportunityId: parsed.data.opportunityId,
      reportId: parsed.data.reportId,
      title: parsed.data.title,
      repoId: parsed.data.repoId,
    });
    return Response.json({ plan });
  } catch {
    return Response.json({ error: "Could not create plan" }, { status: 500 });
  }
}
