import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { websites } from "@/db/schema";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { requireFeature } from "@/lib/billing";
import { getOiSummaryForWebsite } from "@/lib/opportunity-intelligence";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ctx = await loadAgencyContext();
    const feature = await requireFeature(
      ctx.workspace.id,
      "opportunity_intelligence",
    );
    const url = new URL(req.url);
    const websiteId = url.searchParams.get("websiteId");

    const sites = await db.query.websites.findMany({
      where: eq(websites.workspaceId, ctx.workspace.id),
      columns: { id: true, name: true, domain: true, url: true },
      limit: 50,
    });

    if (!websiteId) {
      return Response.json({
        hasAccess: feature.ok,
        upgrade: feature.ok
          ? null
          : {
              code: feature.code,
              message: feature.message,
              suggestedPlan: feature.suggestedPlan,
            },
        websites: sites,
        summary: null,
      });
    }

    if (!feature.ok) {
      return Response.json({
        hasAccess: false,
        upgrade: {
          code: feature.code,
          message: feature.message,
          suggestedPlan: feature.suggestedPlan,
        },
        websites: sites,
        summary: null,
      });
    }

    const summary = await getOiSummaryForWebsite({
      workspaceId: ctx.workspace.id,
      websiteId,
    });
    if (!summary.ok) {
      return Response.json({ error: summary.error }, { status: 404 });
    }

    return Response.json({
      hasAccess: true,
      websites: sites,
      ...summary,
    });
  } catch {
    return Response.json({ error: "Could not load Opportunity Intelligence" }, { status: 500 });
  }
}
