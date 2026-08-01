import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clientReportSchedules } from "@/db/schema";
import { upsertClientReportSchedule } from "@/lib/agency/client-reports";
import { getClient } from "@/lib/agency/clients";
import { requireAgencyPermission } from "@/lib/agency/workspace";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await context.params;
  const client = await getClient(gate.ctx.workspace.id, id);
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  const schedule = await db.query.clientReportSchedules.findFirst({
    where: eq(clientReportSchedules.clientId, id),
  });
  return Response.json({ schedule: schedule ?? null });
}

const putSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "quarterly"]),
  enabled: z.boolean(),
});

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await context.params;
  const client = await getClient(gate.ctx.workspace.id, id);
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.enabled) {
    const { requireFeature, upgradeResponse } = await import("@/lib/billing");
    const featureGate = await requireFeature(
      gate.ctx.workspace.id,
      "scheduled_reports",
    );
    if (!featureGate.ok) return upgradeResponse(featureGate);
  }

  const schedule = await upsertClientReportSchedule({
    clientId: id,
    workspaceId: gate.ctx.workspace.id,
    frequency: parsed.data.frequency,
    enabled: parsed.data.enabled,
  });
  return Response.json({ schedule });
}
