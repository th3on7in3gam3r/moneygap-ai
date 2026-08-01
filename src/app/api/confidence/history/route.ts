import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listConfidenceSnapshots } from "@/lib/confidence";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const history = await listConfidenceSnapshots(ctx.workspace.id, 40);
    return Response.json({
      history: history.map((h) => ({
        id: h.id,
        overallScore: h.overallScore,
        lowConfidenceCount: h.lowConfidenceCount,
        breakdown: h.breakdown,
        reportId: h.reportId,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Could not load history" }, { status: 500 });
  }
}
