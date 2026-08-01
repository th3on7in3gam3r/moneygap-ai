import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  completeLesson,
  isMarketplaceEnabled,
  listAcademy,
} from "@/lib/marketplace";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json({
      enabled: false,
      message: "Marketplace™ is disabled (FEATURE_MARKETPLACE).",
      courses: [],
    });
  }

  const { workspace } = await ensureUserAndWorkspace();
  const courses = await listAcademy(workspace.id);
  return Response.json({
    enabled: true,
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      level: c.level,
      lessons: c.lessons.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        body: l.body,
        completed: l.completed,
      })),
    })),
  });
}

const postSchema = z.object({
  lessonId: z.string().uuid(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMarketplaceEnabled()) {
    return Response.json(
      { error: "Marketplace™ is disabled (FEATURE_MARKETPLACE)." },
      { status: 503 },
    );
  }

  const { userId, workspace } = await ensureUserAndWorkspace();
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await completeLesson({
    workspaceId: workspace.id,
    userId,
    lessonId: parsed.data.lessonId,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ progress: result.progress, event: result.event });
}
