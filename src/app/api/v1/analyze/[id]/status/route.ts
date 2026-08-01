import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websiteAnalyses } from "@/db/schema";
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
  const analysis = await db.query.websiteAnalyses.findFirst({
    where: and(
      eq(websiteAnalyses.id, id),
      eq(websiteAnalyses.workspaceId, authResult.workspaceId),
    ),
  });

  if (!analysis) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "GET",
      path: `/api/v1/analyze/${id}/status`,
      statusCode: 404,
      errorCode: "not_found",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ error: "Analysis not found.", code: "not_found" }, { status: 404 });
  }

  const status =
    analysis.status === "completed"
      ? "completed"
      : analysis.status === "failed"
        ? "failed"
        : "processing";

  await logApiRequest({
    workspaceId: authResult.workspaceId,
    apiKeyId: authResult.apiKeyId,
    method: "GET",
    path: `/api/v1/analyze/${id}/status`,
    statusCode: 200,
    durationMs: Date.now() - started,
    req,
  });

  return Response.json({
    analysis_id: analysis.id,
    status,
    stage: analysis.stage,
    progress: analysis.progress,
    report_id: analysis.reportId,
    website_id: analysis.websiteId,
    error: analysis.error,
    completed_at: analysis.completedAt?.toISOString() ?? null,
  });
}
