import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { setPatternStatus, updatePatternProfile } from "@/lib/knowledge-graph";

const patchSchema = z.object({
  status: z.enum(["active", "draft", "deprecated"]).optional(),
  category: z
    .enum([
      "revenue",
      "acquisition",
      "seo",
      "authority",
      "trust",
      "conversion",
      "retention",
      "automation",
      "ai_adoption",
    ])
    .optional(),
  description: z.string().max(2000).optional(),
  purpose: z.string().max(500).optional(),
  profile: z
    .object({
      impactScore: z.number().min(1).max(100).optional(),
      revenuePotential: z.number().min(1).max(5).optional(),
      applicableIndustries: z.array(z.string()).optional(),
      applicableBusinessModels: z.array(z.string()).optional(),
      goalTypes: z.array(z.string()).optional(),
      maturityLevels: z.array(z.enum(["early", "growth", "scale"])).optional(),
      requiredConditions: z.array(z.string()).optional(),
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
      const row = await setPatternStatus(slug, parsed.data.status);
      if (!row) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ pattern: row });
    }

    const { profile, ...rest } = parsed.data;
    const row = await updatePatternProfile(slug, {
      ...rest,
      profile: profile
        ? {
            impactScore: profile.impactScore,
            revenuePotential: profile.revenuePotential,
            applicableIndustries: profile.applicableIndustries,
            applicableBusinessModels: profile.applicableBusinessModels,
            goalTypes: profile.goalTypes,
            maturityLevels: profile.maturityLevels,
            requiredConditions: profile.requiredConditions,
          }
        : undefined,
    });
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ pattern: row });
  } catch {
    return Response.json({ error: "Could not update pattern" }, { status: 500 });
  }
}
