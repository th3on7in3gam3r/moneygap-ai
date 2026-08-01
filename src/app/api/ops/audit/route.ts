import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { hasCapability } from "@/lib/agency/permissions";
import { loadAgencyContext } from "@/lib/agency/workspace";
import { isPlatform10Enabled } from "@/lib/launch";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatform10Enabled()) {
    return Response.json({
      enabled: false,
      message: "Platform 1.0™ is disabled (FEATURE_PLATFORM_1_0).",
      entries: [],
    });
  }

  const ctx = await loadAgencyContext();
  if (
    !hasCapability(ctx.role, "viewAudit") &&
    !hasCapability(ctx.role, "manageWorkspace")
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "40"), 100);

  const entries = await db.query.auditLogs.findMany({
    where: eq(auditLogs.workspaceId, ctx.workspace.id),
    orderBy: [desc(auditLogs.createdAt)],
    limit,
  });

  return Response.json({
    enabled: true,
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
