import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { websites } from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  BADGE_STYLES,
  generateBadge,
  listBadgesForWorkspace,
} from "@/lib/growth-badge";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const badges = await listBadgesForWorkspace(ctx.workspace.id);
    const sites = await db
      .select({
        id: websites.id,
        name: websites.name,
        domain: websites.domain,
        url: websites.url,
      })
      .from(websites)
      .where(eq(websites.workspaceId, ctx.workspace.id))
      .orderBy(asc(websites.name));
    return Response.json({
      badges,
      websites: sites,
      styles: BADGE_STYLES,
    });
  } catch {
    return Response.json({ error: "Could not load Growth Badges™" }, { status: 500 });
  }
}

const postSchema = z.object({
  websiteId: z.string().uuid(),
  style: z.enum([
    "growth_optimized",
    "analyzed_improved",
    "growth_intelligence",
  ]),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const ctx = await loadAgencyContext();
    const result = await generateBadge({
      workspaceId: ctx.workspace.id,
      websiteId: parsed.data.websiteId,
      style: parsed.data.style,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ badge: result.badge });
  } catch {
    return Response.json({ error: "Could not create Growth Badge™" }, { status: 500 });
  }
}
