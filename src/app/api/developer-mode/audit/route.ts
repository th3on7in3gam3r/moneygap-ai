import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { canManageDeveloperMode, listDeveloperAudit } from "@/lib/developer";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    if (!canManageDeveloperMode(ctx)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const audit = await listDeveloperAudit(ctx.workspace.id);
    return Response.json({
      audit: audit.map((a) => ({
        id: a.id,
        action: a.action,
        repoId: a.repoId,
        planId: a.planId,
        meta: a.meta,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Could not load audit" }, { status: 500 });
  }
}
