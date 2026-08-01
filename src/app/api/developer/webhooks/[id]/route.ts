import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import {
  deleteWebhookEndpoint,
  updateWebhookEndpoint,
} from "@/lib/platform/webhooks";

const patchSchema = z.object({
  url: z.string().url().max(2000).optional(),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: Request,
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
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const row = await updateWebhookEndpoint({
    workspaceId: gate.ctx.workspace.id,
    id,
    ...parsed.data,
  });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ endpoint: row });
}

export async function DELETE(
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
  const row = await deleteWebhookEndpoint(gate.ctx.workspace.id, id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
