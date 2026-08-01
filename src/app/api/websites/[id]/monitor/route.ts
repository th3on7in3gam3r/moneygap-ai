import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { assertWebsiteAccess } from "@/lib/monitor/access";
import {
  getScheduleForWebsite,
  upsertMonitorSchedule,
  type MonitorFrequency,
} from "@/lib/monitor/schedule";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const access = await assertWebsiteAccess(id, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  const schedule = await getScheduleForWebsite(id);
  return Response.json({ schedule: schedule ?? null });
}

const putSchema = z.object({
  frequency: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  intervalDays: z.number().int().min(1).max(365).optional().nullable(),
  enabled: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const access = await assertWebsiteAccess(id, userId);
  if (!access) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid schedule settings" }, { status: 400 });
  }

  const enabling = parsed.data.enabled !== false;
  if (enabling) {
    const { requireFeature, upgradeResponse } = await import("@/lib/billing");
    const gate = await requireFeature(access.workspaceId, "monitor");
    if (!gate.ok) return upgradeResponse(gate);
  }

  const schedule = await upsertMonitorSchedule({
    websiteId: id,
    workspaceId: access.workspaceId,
    frequency: parsed.data.frequency as MonitorFrequency,
    intervalDays: parsed.data.intervalDays,
    enabled: parsed.data.enabled,
  });

  return Response.json({ schedule });
}
