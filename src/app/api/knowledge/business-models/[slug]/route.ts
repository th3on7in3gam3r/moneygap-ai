import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  setBusinessModelStatus,
  updateBusinessModelProfile,
} from "@/lib/knowledge-graph";

const patchSchema = z.object({
  status: z.enum(["active", "draft", "deprecated"]).optional(),
  description: z.string().max(2000).optional(),
  profile: z
    .object({
      commonGaps: z.array(z.string()).optional(),
      growthLevers: z.array(z.string()).optional(),
      benchmarks: z
        .object({
          expectedCapabilities: z.array(z.string()),
          notes: z.string().optional(),
        })
        .optional(),
    })
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
      const row = await setBusinessModelStatus(slug, parsed.data.status);
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ businessModel: row });
    }

    const row = await updateBusinessModelProfile(slug, parsed.data);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ businessModel: row });
  } catch {
    return Response.json({ error: "Could not update business model" }, { status: 500 });
  }
}
