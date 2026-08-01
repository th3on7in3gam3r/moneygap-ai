import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { updateClient } from "@/lib/agency/clients";
import { requireAgencyPermission } from "@/lib/agency/workspace";

const schema = z.object({
  assignedUserId: z.string().nullable(),
});

export async function POST(
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
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const client = await updateClient({
    workspaceId: gate.ctx.workspace.id,
    clientId: id,
    actorUserId: gate.ctx.userId,
    assignedUserId: parsed.data.assignedUserId,
  });
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ client });
}
