import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  getClient,
  getClientHistory,
  updateClient,
} from "@/lib/agency/clients";
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
  const history = await getClientHistory(gate.ctx.workspace.id, id);
  if (!history) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(history);
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  websiteUrl: z.string().max(500).nullable().optional(),
  industry: z.string().max(200).nullable().optional(),
  audience: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  templateId: z.string().uuid().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

export async function PATCH(
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
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const client = await updateClient({
    workspaceId: gate.ctx.workspace.id,
    clientId: id,
    actorUserId: gate.ctx.userId,
    ...parsed.data,
  });
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ client });
}

export async function DELETE(
  _req: Request,
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
  const existing = await getClient(gate.ctx.workspace.id, id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  const client = await updateClient({
    workspaceId: gate.ctx.workspace.id,
    clientId: id,
    actorUserId: gate.ctx.userId,
    status: "archived",
  });
  return Response.json({ client });
}
