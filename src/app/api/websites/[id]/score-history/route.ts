import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scoreSnapshots } from "@/db/schema";
import { assertWebsiteAccess } from "@/lib/monitor/access";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const access = await assertWebsiteAccess(id, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const history = await db.query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.websiteId, id),
    orderBy: [desc(scoreSnapshots.createdAt)],
    limit: 90,
  });

  return Response.json({
    history: history
      .slice()
      .reverse()
      .map((h) => ({
        id: h.id,
        reportId: h.reportId,
        moneyGapScore: h.moneyGapScore,
        categoryScores: h.categoryScores,
        revenueAtRisk: h.revenueAtRisk,
        capturePotential: h.capturePotential,
        capturedOpportunity: h.capturedOpportunity,
        createdAt: h.createdAt.toISOString(),
      })),
  });
}
