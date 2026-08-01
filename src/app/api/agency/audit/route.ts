import { auth } from "@clerk/nextjs/server";
import { hasCapability } from "@/lib/agency/permissions";
import { listAuditTimeline, loadTeamContext, requireTeamFeature } from "@/lib/team";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feature = await requireTeamFeature();
  if (!feature.ok) {
    return Response.json(
      { enabled: false, message: feature.error, entries: [] },
      { status: 200 },
    );
  }

  const ctx = await loadTeamContext();
  if (
    !ctx.isClient &&
    !hasCapability(ctx.role, "viewAudit") &&
    !hasCapability(ctx.role, "manageTeam")
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const limit = Number(url.searchParams.get("limit") || "50");
  const format = url.searchParams.get("format");

  const result = await listAuditTimeline({
    ctx,
    limit,
    clientId: clientId || null,
  });

  if (format === "csv") {
    const header = "createdAt,action,entityType,entityId,actorUserId\n";
    const lines = result.entries.map(
      (e) =>
        `${e.createdAt.toISOString()},${e.action},${e.entityType},${e.entityId ?? ""},${e.actorUserId ?? ""}`,
    );
    return new Response(header + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="audit.csv"',
      },
    });
  }

  return Response.json({
    enabled: true,
    entries: result.entries.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      actorUserId: e.actorUserId,
      meta: e.meta,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
