import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createClient, listClients } from "@/lib/agency/clients";
import { requireAgencyPermission } from "@/lib/agency/workspace";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("viewClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const archived = new URL(req.url).searchParams.get("archived") === "1";
  const clients = await listClients(gate.ctx.workspace.id, archived);
  return Response.json({ clients });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  websiteUrl: z.string().max(500).nullable().optional(),
  industry: z.string().max(200).nullable().optional(),
  audience: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  templateId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageClients");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { requireFeature, upgradeResponse } = await import("@/lib/billing");
  const featureGate = await requireFeature(
    gate.ctx.workspace.id,
    "agency_workspace",
  );
  if (!featureGate.ok) return upgradeResponse(featureGate);

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await createClient({
    workspaceId: gate.ctx.workspace.id,
    actorUserId: gate.ctx.userId,
    plan: gate.ctx.workspace.plan,
    ...parsed.data,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ client: result.client });
}
