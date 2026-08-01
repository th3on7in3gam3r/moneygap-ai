import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  addOpportunityComment,
  listOpportunityComments,
  loadTeamContext,
  requireTeamFeature,
} from "@/lib/team";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error, comments: [] }, { status: 200 });
  }

  const url = new URL(req.url);
  const reportId = url.searchParams.get("reportId");
  const opportunityId = url.searchParams.get("opportunityId");
  if (!reportId || !opportunityId) {
    return Response.json({ error: "reportId and opportunityId required" }, { status: 400 });
  }

  const ctx = await loadTeamContext();
  const result = await listOpportunityComments({ ctx, reportId, opportunityId });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    comments: result.comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorUserId: c.authorUserId,
      authorName:
        [c.author?.firstName, c.author?.lastName].filter(Boolean).join(" ") ||
        c.author?.email ||
        "Member",
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

const postSchema = z.object({
  reportId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  projectId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error }, { status: feature.status });
  }

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const ctx = await loadTeamContext();
  const result = await addOpportunityComment({
    ctx,
    ...parsed.data,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ comment: result.comment });
}
