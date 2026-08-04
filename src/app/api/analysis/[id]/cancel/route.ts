import { auth } from "@clerk/nextjs/server";
import { cancelRunningAnalysis } from "@/lib/analysis/pipeline";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await cancelRunningAnalysis({ analysisId: id, userId });

  if (result.reason === "not_found") {
    return Response.json({ error: "Analysis not found." }, { status: 404 });
  }
  if (result.reason === "already_complete") {
    return Response.json(
      { error: "Analysis already completed." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true, reason: result.reason });
}
