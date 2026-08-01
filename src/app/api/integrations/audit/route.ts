import { auth } from "@clerk/nextjs/server";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { listIntegrationAudit } from "@/lib/integrations";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const ctx = await loadAgencyContext();
    const isOwner = ctx.workspace.ownerId === ctx.userId;
    if (!isOwner && ctx.role !== "owner" && ctx.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await listIntegrationAudit(ctx.workspace.id);
    return Response.json({
      audit: rows.map((r) => ({
        id: r.id,
        action: r.action,
        providerSlug: r.providerSlug,
        connectionId: r.connectionId,
        actorUserId: r.actorUserId,
        meta: r.meta,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch {
    return Response.json({ error: "Could not load audit" }, { status: 500 });
  }
}
