import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAgencyPermission } from "@/lib/agency/workspace";
import { requireFeature, upgradeResponse } from "@/lib/billing";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  WEBHOOK_EVENTS,
} from "@/lib/platform/webhooks";

export async function GET() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireAgencyPermission("manageWorkspace");
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }
  const endpoints = await listWebhookEndpoints(gate.ctx.workspace.id);
  return Response.json({
    events: WEBHOOK_EVENTS,
    endpoints: endpoints.map((e) => ({
      id: e.id,
      url: e.url,
      events: e.events,
      enabled: e.enabled,
      description: e.description,
      secretPreview: `${e.secret.slice(0, 10)}…`,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

const postSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.string()).min(1),
  description: z.string().max(500).nullable().optional(),
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

  const events = parsed.data.events.filter((e) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e),
  );
  if (events.length === 0) {
    return Response.json({ error: "Select at least one valid event" }, { status: 400 });
  }

  const endpoint = await createWebhookEndpoint({
    workspaceId: gate.ctx.workspace.id,
    url: parsed.data.url,
    events,
    description: parsed.data.description,
  });

  return Response.json({
    endpoint: {
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      enabled: endpoint.enabled,
      secret: endpoint.secret,
    },
    note: "Store the webhook signing secret securely.",
  });
}
