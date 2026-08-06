import { auth } from "@clerk/nextjs/server";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { redeliverWebhookDelivery } from "@/lib/platform/webhooks";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await context.params;
  const row = await redeliverWebhookDelivery(gate.ctx.workspace.id, id);
  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    delivery: {
      id: row.id,
      endpointId: row.endpointId,
      event: row.event,
      status: row.status,
      responseStatus: row.responseStatus,
      attempts: row.attempts,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
    },
  });
}
