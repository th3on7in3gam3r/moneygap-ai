import { auth } from "@clerk/nextjs/server";
import {
  createDraftFromIdea,
  ensureGrowthAcademyCatalog,
  isGrowthAcademyEnabled,
  listOpenContentIdeas,
} from "@/lib/growth-academy";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ enabled: false, ideas: [] });
  }
  await ensureGrowthAcademyCatalog();
  const ideas = await listOpenContentIdeas();
  return Response.json({ enabled: true, ideas });
}

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }

  const body = (await req.json()) as { ideaId?: string };
  if (!body.ideaId) {
    return Response.json({ error: "ideaId required" }, { status: 400 });
  }

  try {
    const article = await createDraftFromIdea(body.ideaId, userId);
    return Response.json({ ok: true, article });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
