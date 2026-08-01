import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  getPredictiveOverview,
  isPredictiveIntelEnabled,
} from "@/lib/predictive";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPredictiveIntelEnabled()) {
    return Response.json({
      enabled: false,
      message: "Predictive Intelligence™ is disabled (FEATURE_PREDICTIVE_INTEL).",
      predictions: [],
      byKind: {},
      openCount: 0,
      websites: [],
      focusWebsite: null,
    });
  }

  try {
    const ctx = await loadAgencyContext();
    const websiteId = new URL(req.url).searchParams.get("website");
    const overview = await getPredictiveOverview(
      ctx.workspace.id,
      websiteId,
    );
    return Response.json(overview);
  } catch {
    return Response.json(
      { error: "Could not load Predictive Center" },
      { status: 500 },
    );
  }
}
