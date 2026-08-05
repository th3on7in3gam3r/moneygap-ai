import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
import { pauseScan } from "@/lib/scan/jobs";

export const maxDuration = 30;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const row = await db.query.websiteAnalyses.findFirst({
    where: and(
      eq(websiteAnalyses.id, id),
      eq(websiteAnalyses.userId, userId),
    ),
    columns: { id: true, scanPhase: true },
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const ok = await pauseScan(id);
  if (!ok) {
    return Response.json({ error: "Cannot pause this scan." }, { status: 400 });
  }
  return Response.json({ ok: true, scanPhase: "paused" });
}
