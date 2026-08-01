import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { generatedAssets, moneyGapOpportunities } from "@/db/schema";
import {
  formatContextForPrompt,
  loadAdvisorContext,
  assertReportAccess,
} from "@/lib/advisor/context";
import { generateAssetPack } from "@/lib/advisor/generate";
import {
  resolvePlaybook,
  type PlaybookId,
} from "@/lib/advisor/playbooks";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

export async function POST(
  req: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await context.params;
  const access = await assertReportAccess(reportId, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const { requireFeatureAndUsage, upgradeResponse, recordUsage } = await import(
    "@/lib/billing"
  );
  const gate = await requireFeatureAndUsage({
    workspaceId: access.report.workspaceId,
    feature: "action_center",
    usageType: "ai_generation",
  });
  if (!gate.ok) return upgradeResponse(gate);

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: MISSING_KEYS_ERROR }, { status: 400 });
  }

  const body = (await req.json()) as {
    opportunityId?: string;
    playbook?: PlaybookId;
    projectId?: string;
  };

  if (!body.opportunityId) {
    return Response.json({ error: "opportunityId required" }, { status: 400 });
  }

  const opportunity = await db.query.moneyGapOpportunities.findFirst({
    where: and(
      eq(moneyGapOpportunities.id, body.opportunityId),
      eq(moneyGapOpportunities.reportId, reportId),
    ),
  });
  if (!opportunity) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const playbook =
    body.playbook ??
    resolvePlaybook({
      moduleId: opportunity.moduleId,
      title: opportunity.title,
      category: opportunity.category,
      whatsMissing: opportunity.whatsMissing,
    });

  const ctx = await loadAdvisorContext(reportId);
  if (!ctx) return Response.json({ error: "Context unavailable" }, { status: 404 });

  try {
    const pack = await generateAssetPack({
      playbook,
      opportunity: {
        title: opportunity.title,
        whatsMissing: opportunity.whatsMissing,
        whyItMatters: opportunity.whyItMatters,
        businessImpact: opportunity.businessImpact,
        moduleId: opportunity.moduleId,
      },
      contextJson: formatContextForPrompt(ctx, opportunity.id),
    });

    const [asset] = await db
      .insert(generatedAssets)
      .values({
        reportId,
        opportunityId: opportunity.id,
        projectId: body.projectId ?? null,
        userId,
        playbook,
        title: pack.title,
        content: pack.sections,
        status: "draft",
      })
      .returning();

    await recordUsage({
      workspaceId: access.report.workspaceId,
      type: "ai_generation",
      meta: { reportId, assetId: asset.id, playbook },
    });

    return Response.json({ asset });
  } catch (err) {
    console.error("generate asset:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
