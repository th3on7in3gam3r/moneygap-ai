import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { websiteAnalyses, websites } from "@/db/schema";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { validateAndNormalizeUrl } from "@/lib/analysis/url";
import { assertWithinLimit, recordUsage } from "@/lib/billing";
import {
  apiError,
  authenticateApiRequest,
  logApiRequest,
} from "@/lib/platform";

const bodySchema = z.object({
  website_url: z.string().min(1),
  industry: z.string().max(200).optional(),
  business_type: z.string().max(200).optional(),
  target_audience: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const started = Date.now();
  const authResult = await authenticateApiRequest(req, "analyze");
  if (!authResult.ok) return apiError(authResult);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "POST",
      path: "/api/v1/analyze",
      statusCode: 400,
      errorCode: "invalid_json",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ error: "Invalid JSON body.", code: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "POST",
      path: "/api/v1/analyze",
      statusCode: 400,
      errorCode: "invalid_body",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json(
      { error: "website_url is required.", code: "invalid_body" },
      { status: 400 },
    );
  }

  const validated = validateAndNormalizeUrl(parsed.data.website_url);
  if (!validated.ok) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "POST",
      path: "/api/v1/analyze",
      statusCode: 400,
      errorCode: "invalid_url",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json({ error: validated.error, code: "invalid_url" }, { status: 400 });
  }

  const analysisLimit = await assertWithinLimit({
    workspaceId: authResult.workspaceId,
    planId: authResult.planId,
    type: "website_analysis",
  });
  if (!analysisLimit.ok) {
    await logApiRequest({
      workspaceId: authResult.workspaceId,
      apiKeyId: authResult.apiKeyId,
      method: "POST",
      path: "/api/v1/analyze",
      statusCode: 429,
      errorCode: "usage_limit",
      durationMs: Date.now() - started,
      req,
    });
    return Response.json(
      {
        error: analysisLimit.message,
        code: "usage_limit",
        limit: analysisLimit.limit,
        used: analysisLimit.used,
      },
      { status: 429 },
    );
  }

  const domainMatch = await db.query.websites.findFirst({
    where: and(
      eq(websites.workspaceId, authResult.workspaceId),
      eq(websites.domain, validated.value.domain),
    ),
  });

  let websiteId: string;
  if (domainMatch) {
    websiteId = domainMatch.id;
    await db
      .update(websites)
      .set({
        url: validated.value.href,
        status: "queued",
        updatedAt: new Date(),
      })
      .where(eq(websites.id, websiteId));
  } else {
    const [site] = await db
      .insert(websites)
      .values({
        workspaceId: authResult.workspaceId,
        name: validated.value.domain,
        url: validated.value.href,
        domain: validated.value.domain,
        status: "queued",
      })
      .returning();
    websiteId = site.id;
  }

  const [analysis] = await db
    .insert(websiteAnalyses)
    .values({
      userId: authResult.workspaceOwnerId,
      workspaceId: authResult.workspaceId,
      websiteId,
      url: validated.value.href,
      status: "queued",
      stage: "Queued",
      progress: 0,
    })
    .returning();

  await recordUsage({
    workspaceId: authResult.workspaceId,
    userId: authResult.workspaceOwnerId,
    type: "website_analysis",
    meta: {
      analysisId: analysis.id,
      source: "api_v1",
      industry: parsed.data.industry ?? null,
      business_type: parsed.data.business_type ?? null,
      target_audience: parsed.data.target_audience ?? null,
    },
  });

  after(() => {
    void runAnalysisPipeline(analysis.id);
  });

  await logApiRequest({
    workspaceId: authResult.workspaceId,
    apiKeyId: authResult.apiKeyId,
    method: "POST",
    path: "/api/v1/analyze",
    statusCode: 202,
    durationMs: Date.now() - started,
    req,
    meta: { analysisId: analysis.id, websiteId },
  });

  return Response.json(
    {
      analysis_id: analysis.id,
      website_id: websiteId,
      status: "processing",
      estimated_completion: "2–5 minutes",
    },
    { status: 202 },
  );
}
