import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listConfidenceRecommendations } from "@/lib/confidence";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const url = new URL(req.url);
    const lowOnly = url.searchParams.get("low") === "1";
    const websiteId = url.searchParams.get("website");
    const recommendations = await listConfidenceRecommendations(
      ctx.workspace.id,
      { lowOnly, websiteId },
    );
    return Response.json({ recommendations });
  } catch {
    return Response.json(
      { error: "Could not load recommendations" },
      { status: 500 },
    );
  }
}
