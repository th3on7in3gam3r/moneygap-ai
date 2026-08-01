import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { requireFeature, upgradeResponse } from "@/lib/billing";
import { revokeApiKey, rotateApiKey } from "@/lib/platform/keys";

const patchSchema = z.object({
  action: z.enum(["revoke", "rotate"]),
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

  const feature = await requireFeature(gate.ctx.workspace.id, "api_access");
  if (!feature.ok) return upgradeResponse(feature);

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    const row = await revokeApiKey(gate.ctx.workspace.id, id);
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  }

  const rotated = await rotateApiKey({
    workspaceId: gate.ctx.workspace.id,
    keyId: id,
    createdBy: gate.ctx.userId,
  });
  if (!rotated.ok) {
    if ("denied" in rotated && rotated.denied) {
      return upgradeResponse(rotated.denied);
    }
    return Response.json({ error: "error" in rotated ? rotated.error : "Failed" }, { status: 400 });
  }

  return Response.json({
    key: {
      id: rotated.key.id,
      name: rotated.key.name,
      keyPrefix: rotated.key.keyPrefix,
      environment: rotated.key.environment,
      scopes: rotated.key.scopes,
    },
    secret: rotated.secret,
    note: "Previous key revoked. Copy the new secret now.",
  });
}
