import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  listOpportunityApprovals,
  loadTeamContext,
  requireTeamFeature,
  submitOpportunityApproval,
} from "@/lib/team";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json({ error: feature.error, approvals: [] }, { status: 200 });
  }

  const url = new URL(req.url);
  const reportId = url.searchParams.get("reportId");
  const opportunityId = url.searchParams.get("opportunityId");
  if (!reportId || !opportunityId) {
    return Response.json({ error: "reportId and opportunityId required" }, { status: 400 });
  }

  const ctx = await loadTeamContext();
  const result = await listOpportunityApprovals({ ctx, reportId, opportunityId });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    approvals: result.approvals.map((a) => ({
      id: a.id,
      status: a.status,
      note: a.note,
      actorUserId: a.actorUserId,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

const postSchema = z.object({
  reportId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
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
  const result = await submitOpportunityApproval({
    ctx,
    ...parsed.data,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ approval: result.approval });
}
