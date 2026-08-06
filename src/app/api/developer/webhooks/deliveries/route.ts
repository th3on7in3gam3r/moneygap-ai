import { auth } from "@clerk/nextjs/server";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { listWebhookDeliveries } from "@/lib/platform/webhooks";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const url = new URL(req.url);
  const endpointId = url.searchParams.get("endpointId")?.trim() || undefined;
  const limitRaw = Number(url.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 40;

  const rows = await listWebhookDeliveries(gate.ctx.workspace.id, {
    endpointId,
    limit,
  });

  return Response.json({
    deliveries: rows.map((d) => ({
      id: d.id,
      endpointId: d.endpointId,
      event: d.event,
      status: d.status,
      responseStatus: d.responseStatus,
      attempts: d.attempts,
      lastError: d.lastError,
      createdAt: d.createdAt.toISOString(),
      deliveredAt: d.deliveredAt?.toISOString() ?? null,
    })),
  });
}
