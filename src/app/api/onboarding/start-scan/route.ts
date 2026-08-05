import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { websiteAnalyses, websites } from "@/db/schema";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { verifyUrlReachable } from "@/lib/analysis/url";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  getOrCreateOnboarding,
  isIntelligentOnboardingEnabled,
  updateOnboarding,
} from "@/lib/onboarding";

/** Match /api/analysis — Money Gap Engine often needs the full after() budget. */
export const maxDuration = 300;

const schema = z.object({
  url: z.string().min(1).optional(),
  scanProfile: z.enum(["quick", "standard", "deep", "enterprise"]).optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isIntelligentOnboardingEnabled()) {
    return Response.json({ error: "Onboarding disabled" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json().catch(() => ({})));
  const { workspace, userId: dbUserId } = await ensureUserAndWorkspace();
  const row = await getOrCreateOnboarding(workspace.id);
  const url = (body.success && body.data.url?.trim()) || row?.primaryWebsiteUrl;
  if (!url) {
    return Response.json({ error: "Add a website URL first." }, { status: 400 });
  }

  const validated = await verifyUrlReachable(url);
  if (!validated.ok) {
    return Response.json(
      { error: validated.error, code: validated.code ?? "unreachable" },
      { status: 400 },
    );
  }

  const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
    "@/lib/billing"
  );
  const gate = await requireFeatureAndUsage({
    workspaceId: workspace.id,
    feature: "moneygap_engine",
    usageType: "website_analysis",
  });
  if (!gate.ok) return upgradeResponse(gate);

  const domainMatch = await db.query.websites.findFirst({
    where: and(
      eq(websites.workspaceId, workspace.id),
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
        workspaceId: workspace.id,
        name: validated.value.domain,
        url: validated.value.href,
        domain: validated.value.domain,
        status: "queued",
      })
      .returning();
    websiteId = site.id;
  }

  const scanProfile = body.success
    ? (body.data.scanProfile ?? "quick")
    : "quick";

  const [analysis] = await db
    .insert(websiteAnalyses)
    .values({
      userId: dbUserId,
      workspaceId: workspace.id,
      websiteId,
      url: validated.value.href,
      status: "queued",
      stage: "Queued",
      progress: 0,
      scanProfile,
      scanPhase: "queued",
    })
    .returning();

  await updateOnboarding(workspace.id, {
    status: "in_progress",
    currentStep: "scan",
    primaryWebsiteUrl: validated.value.href,
    analysisId: analysis.id,
  });

  await recordUsage({
    workspaceId: workspace.id,
    userId: dbUserId,
    type: "website_analysis",
    meta: { analysisId: analysis.id, source: "onboarding" },
  });

  after(() => {
    void runAnalysisPipeline(analysis.id);
  });

  return Response.json({ analysisId: analysis.id });
}
