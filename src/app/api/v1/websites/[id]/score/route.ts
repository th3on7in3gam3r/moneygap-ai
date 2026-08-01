import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, scoreSnapshots, websites } from "@/db/schema";
import {
  apiError,
  authenticateApiRequest,
  logApiRequest,
} from "@/lib/platform";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const started = Date.now();
  const authResult = await authenticateApiRequest(req, "read");
  if (!authResult.ok) return apiError(authResult);

  const { id } = await context.params;
  const website = await db.query.websites.findFirst({
    where: and(eq(websites.id, id), eq(websites.workspaceId, authResult.workspaceId)),
  });

  if (!website) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "GET",
      path: `/api/v1/websites/${id}/score`,
      statusCode: 404,
      errorCode: "not_found",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ error: "Website not found.", code: "not_found" }, { status: 404 });
  }

  const latestReport = await db.query.reports.findFirst({
    where: and(
      eq(reports.websiteId, id),
      eq(reports.workspaceId, authResult.workspaceId),
      eq(reports.type, "intelligence"),
    ),
    orderBy: [desc(reports.createdAt)],
  });

  const history = await db.query.scoreSnapshots.findMany({
    where: eq(scoreSnapshots.websiteId, id),
    orderBy: [desc(scoreSnapshots.createdAt)],
    limit: 30,
  });

  await logApiRequest({
    workspaceId: authResult.workspaceId,
    apiKeyId: authResult.apiKeyId,
    method: "GET",
    path: `/api/v1/websites/${id}/score`,
    statusCode: 200,
    durationMs: Date.now() - started,
    req,
  });

  return Response.json({
    website_id: website.id,
    domain: website.domain,
    overall_score: latestReport?.moneyGapScore ?? null,
    category_scores: latestReport?.categoryScores ?? null,
    revenue_at_risk: latestReport?.revenueAtRisk ?? null,
    capture_potential: latestReport?.capturePotential ?? null,
    report_id: latestReport?.id ?? null,
    score_history: history.map((h) => ({
      score: h.moneyGapScore,
      category_scores: h.categoryScores,
      revenue_at_risk: h.revenueAtRisk,
      capture_potential: h.capturePotential,
      created_at: h.createdAt.toISOString(),
    })),
  });
}
