import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { requireFeature, upgradeResponse } from "@/lib/billing";
import { createApiKey, listApiKeys } from "@/lib/platform/keys";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const keys = await listApiKeys(gate.ctx.workspace.id);
  return Response.json({
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      environment: k.environment,
      scopes: k.scopes,
      rateLimitPerMinute: k.rateLimitPerMinute,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
}

const postSchema = z.object({
  name: z.string().min(1).max(120),
  environment: z.enum(["development", "production"]).default("development"),
  scopes: z.array(z.enum(["analyze", "read", "webhooks"])).optional(),
});

export async function POST(req: Request) {
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

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await createApiKey({
    workspaceId: gate.ctx.workspace.id,
    name: parsed.data.name,
    environment: parsed.data.environment,
    scopes: parsed.data.scopes,
    createdBy: gate.ctx.userId,
  });

  if (!result.ok) {
    return upgradeResponse(result.denied);
  }

  return Response.json({
    key: {
      id: result.key.id,
      name: result.key.name,
      keyPrefix: result.key.keyPrefix,
      environment: result.key.environment,
      scopes: result.key.scopes,
      createdAt: result.key.createdAt.toISOString(),
    },
    secret: result.secret,
    note: "Copy this secret now. It will not be shown again.",
  });
}
