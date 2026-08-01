import { auth } from "@clerk/nextjs/server";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { isMarketplaceEnabled, listVerifiedInsights } from "@/lib/marketplace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json({
      enabled: false,
      message: "Marketplace™ is disabled (FEATURE_MARKETPLACE).",
      insights: [],
    });
  }

  await ensureUserAndWorkspace();
  const insights = await listVerifiedInsights();
  return Response.json({
    enabled: true,
    insights: insights.map((i) => ({
      id: i.id,
      slug: i.slug,
      title: i.title,
      insight: i.insight,
      evidence: i.evidence,
      sampleSizeBand: i.sampleSizeBand,
      confidence: i.confidence,
      labeled: i.labeled,
    })),
  });
}
