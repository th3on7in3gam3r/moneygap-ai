import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyGapOpportunities, reports, websites } from "@/db/schema";
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
      path: `/api/v1/websites/${id}/opportunities`,
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

  if (!latestReport) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "GET",
      path: `/api/v1/websites/${id}/opportunities`,
      statusCode: 200,
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ website_id: id, report_id: null, opportunities: [] });
  }

  const rows = await db.query.moneyGapOpportunities.findMany({
    where: eq(moneyGapOpportunities.reportId, latestReport.id),
    orderBy: [desc(moneyGapOpportunities.createdAt)],
  });

  await logApiRequest({
    workspaceId: authResult.workspaceId,
    apiKeyId: authResult.apiKeyId,
    method: "GET",
    path: `/api/v1/websites/${id}/opportunities`,
    statusCode: 200,
    durationMs: Date.now() - started,
    req,
  });

  return Response.json({
    website_id: id,
    report_id: latestReport.id,
    opportunities: rows.map((o) => ({
      id: o.id,
      finding: o.title,
      category: o.category,
      priority: o.severity,
      impact: o.businessImpact,
      whats_missing: o.whatsMissing,
      why_it_matters: o.whyItMatters,
      recommendations: o.fixes,
      estimated_time: o.estimatedTime,
      module_id: o.moduleId,
      status: o.implementationStatus ?? o.status,
    })),
  });
}
