import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { loadAgencyContext } from "@/lib/agency/workspace";
import {
  analyzeDeveloperRepo,
  canManageDeveloperMode,
  requireExplicitAuthorize,
} from "@/lib/developer";

const bodySchema = z.object({
  authorize: z.literal(true),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const json = await req.json().catch(() => ({}));
    if (!requireExplicitAuthorize(json as { authorize?: unknown })) {
      return Response.json(
        { error: "Explicit authorize: true is required to analyze a repository" },
        { status: 400 },
      );
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Explicit authorize: true is required to analyze a repository" },
        { status: 400 },
      );
    }
    const result = await analyzeDeveloperRepo({
      workspaceId: ctx.workspace.id,
      userId: ctx.userId,
      repoId: id,
    });
    if (!result.ok) {
      return Response.json(
        { error: result.error, hubPath: "/dashboard/integrations" },
        { status: result.status },
      );
    }
    return Response.json({
      stack: result.stack,
      profileId: result.profile.id,
      repoId: result.repoId,
    });
  } catch {
    return Response.json({ error: "Could not analyze repository" }, { status: 500 });
  }
}
