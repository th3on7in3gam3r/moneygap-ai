import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  getConfidenceOverview,
  listConfidenceRecommendations,
  refreshConfidenceSnapshot,
} from "@/lib/confidence";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const websiteId = new URL(req.url).searchParams.get("website");
    const data = await getConfidenceOverview(ctx.workspace.id, websiteId);
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Could not load Confidence Center" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const url = new URL(req.url);
    let websiteId = url.searchParams.get("website");
    try {
      const body = (await req.json()) as { websiteId?: string };
      if (body.websiteId) websiteId = body.websiteId;
    } catch {
      /* empty body ok */
    }
    const result = await refreshConfidenceSnapshot(
      ctx.workspace.id,
      websiteId,
    );
    const recommendations = await listConfidenceRecommendations(
      ctx.workspace.id,
      { websiteId },
    );
    return Response.json({
      ...result.overview,
      refreshed: result.ok,
      refreshMessage: result.message,
      recommendations,
    });
  } catch {
    return Response.json(
      { error: "Could not refresh Confidence Center" },
      { status: 500 },
    );
  }
}
