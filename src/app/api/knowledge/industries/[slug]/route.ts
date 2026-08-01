import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  setIndustryStatus,
  updateIndustryProfile,
} from "@/lib/knowledge-graph";

const patchSchema = z.object({
  status: z.enum(["active", "draft", "deprecated"]).optional(),
  description: z.string().max(2000).optional(),
  commonGaps: z.array(z.string()).optional(),
  characteristics: z.array(z.string()).optional(),
  conversionPatterns: z.array(z.string()).optional(),
  seoExpectations: z.array(z.string()).optional(),
  benchmarks: z
    .object({
      expectedFeatures: z.array(z.string()),
      peerCategoryTargets: z.record(z.string(), z.number()).optional(),
      notes: z.string().optional(),
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

    const keys = Object.keys(parsed.data);
    if (keys.length === 1 && parsed.data.status !== undefined) {
      const row = await setIndustryStatus(slug, parsed.data.status);
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ industry: row });
    }

    const row = await updateIndustryProfile(slug, parsed.data);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ industry: row });
  } catch {
    return Response.json({ error: "Could not update industry" }, { status: 500 });
  }
}
