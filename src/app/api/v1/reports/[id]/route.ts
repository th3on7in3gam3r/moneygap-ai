import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyGapOpportunities, reports } from "@/db/schema";
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
  const report = await db.query.reports.findFirst({
    where: and(
      eq(reports.id, id),
      eq(reports.workspaceId, authResult.workspaceId),
    ),
    with: {
      website: true,
      businessProfile: true,
      audienceProfile: true,
    },
  });

  if (!report) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "GET",
      path: `/api/v1/reports/${id}`,
      statusCode: 404,
      errorCode: "not_found",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ error: "Report not found.", code: "not_found" }, { status: 404 });
  }

  const opportunities = await db.query.moneyGapOpportunities.findMany({
    where: eq(moneyGapOpportunities.reportId, report.id),
  });

  await logApiRequest({
    workspaceId: authResult.workspaceId,
    apiKeyId: authResult.apiKeyId,
    method: "GET",
    path: `/api/v1/reports/${id}`,
    statusCode: 200,
    durationMs: Date.now() - started,
    req,
  });

  return Response.json({
    id: report.id,
    website_id: report.websiteId,
    domain: report.website?.domain ?? null,
    title: report.title,
    type: report.type,
    status: report.status,
    money_gap_score: report.moneyGapScore,
    category_scores: report.categoryScores,
    revenue_at_risk: report.revenueAtRisk,
    capture_potential: report.capturePotential,
    overview: report.overview,
    summary: report.summary,
    opportunity_summary: report.opportunitySummary,
    executive_brief: report.executiveBrief,
    business: report.businessProfile
      ? {
          industry: report.businessProfile.industry,
          business_type: report.businessProfile.businessType,
          offerings: report.businessProfile.productsServices,
          target_customer: report.businessProfile.targetCustomer,
        }
      : null,
    audience: report.audienceProfile
      ? {
          primary: report.audienceProfile.primaryAudience,
          pain_points: report.audienceProfile.customerProblems,
        }
      : null,
    opportunities: opportunities.map((o) => ({
      id: o.id,
      finding: o.title,
      category: o.category,
      priority: o.severity,
      impact: o.businessImpact,
      recommendations: o.fixes,
    })),
    created_at: report.createdAt.toISOString(),
  });
}
