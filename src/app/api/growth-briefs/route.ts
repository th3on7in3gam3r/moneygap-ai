import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { growthBriefs } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export async function GET(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { workspace } = await ensureUserAndWorkspace();
    const url = new URL(req.url);
    const websiteId = url.searchParams.get("websiteId");
    const limit = Math.min(20, Number(url.searchParams.get("limit") ?? 10) || 10);

    const briefs = await db.query.growthBriefs.findMany({
      where: websiteId
        ? eq(growthBriefs.websiteId, websiteId)
        : eq(growthBriefs.workspaceId, workspace.id),
      orderBy: [desc(growthBriefs.createdAt)],
      limit,
    });

    // Filter to workspace when websiteId provided
    const filtered = websiteId
      ? briefs.filter((b) => b.workspaceId === workspace.id)
      : briefs;

    return Response.json({
      briefs: filtered.map((b) => ({
        id: b.id,
        websiteId: b.websiteId,
        title: b.title,
        body: b.body,
        payload: b.payload,
        periodStart: b.periodStart.toISOString(),
        periodEnd: b.periodEnd.toISOString(),
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
