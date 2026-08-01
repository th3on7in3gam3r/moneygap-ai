import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { setPlaybookStatus, updatePlaybook } from "@/lib/knowledge-graph";

const patchSchema = z.object({
  status: z.enum(["active", "draft", "deprecated"]).optional(),
  name: z.string().max(200).optional(),
  patternSlugs: z.array(z.string()).optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        action: z.string(),
        patternSlug: z.string().optional(),
        moduleId: z.string().optional(),
        order: z.number(),
      }),
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    const isOwner = ctx.workspace.ownerId === ctx.userId;
    if (!isOwner && ctx.role !== "owner" && ctx.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }

    if (
      parsed.data.status !== undefined &&
      Object.keys(parsed.data).length === 1
    ) {
      const row = await setPlaybookStatus(slug, parsed.data.status);
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ playbook: row });
    }

    const row = await updatePlaybook(slug, parsed.data);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ playbook: row });
  } catch {
    return Response.json({ error: "Could not update playbook" }, { status: 500 });
  }
}
