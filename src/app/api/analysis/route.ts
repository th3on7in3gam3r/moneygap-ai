import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { websiteAnalyses, websites } from "@/db/schema";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { verifyUrlReachable } from "@/lib/analysis/url";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export const maxDuration = 300;

const createSchema = z.object({
  url: z.string().min(1),
  scanProfile: z.enum(["quick", "standard", "deep", "enterprise"]).optional(),
});

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a website URL to analyze." }, { status: 400 });
  }

  const validated = await verifyUrlReachable(parsed.data.url);
  if (!validated.ok) {
    return Response.json(
      {
        error: validated.error,
        code: validated.code ?? "unreachable",
        diagnostics: validated.diagnostics,
      },
      { status: 400 },
    );
  }

  try {
    const { userId: dbUserId, workspace } = await ensureUserAndWorkspace();

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
        scanProfile: parsed.data.scanProfile ?? "standard",
        scanPhase: "queued",
      })
      .returning();

    await recordUsage({
      workspaceId: workspace.id,
      userId: dbUserId,
      type: "website_analysis",
      meta: { analysisId: analysis.id },
    });

    after(() => {
      void runAnalysisPipeline(analysis.id);
    });

    return Response.json({ analysisId: analysis.id });
  } catch (err) {
    console.error("Create analysis error:", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: "We couldn't start this analysis. Please try again." },
      { status: 500 },
    );
  }
}
