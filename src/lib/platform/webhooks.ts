import { createHmac, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { webhookDeliveries, webhookEndpoints } from "@/db/schema";

export const WEBHOOK_EVENTS = [
  "analysis.completed",
  "report.generated",
  "score.updated",
  "opportunity.detected",
  "project.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signWebhookPayload(secret: string, body: string) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

export async function listWebhookEndpoints(workspaceId: string) {
  return db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.workspaceId, workspaceId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function createWebhookEndpoint(input: {
  workspaceId: string;
  url: string;
  events: string[];
  description?: string | null;
}) {
  const secret = generateWebhookSecret();
  const [row] = await db
    .insert(webhookEndpoints)
    .values({
      workspaceId: input.workspaceId,
      url: input.url,
      secret,
      events: input.events,
      description: input.description ?? null,
      enabled: true,
    })
    .returning();
  return row;
}

export async function updateWebhookEndpoint(input: {
  workspaceId: string;
  id: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
  description?: string | null;
}) {
  const [row] = await db
    .update(webhookEndpoints)
    .set({
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.events !== undefined ? { events: input.events } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(webhookEndpoints.id, input.id),
        eq(webhookEndpoints.workspaceId, input.workspaceId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteWebhookEndpoint(workspaceId: string, id: string) {
  const [row] = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.workspaceId, workspaceId),
      ),
    )
    .returning();
  return row ?? null;
}

/** Soft-fail dispatch — never throw to callers. */
export async function emitWebhookEvent(input: {
  workspaceId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
}) {
  try {
    const endpoints = await db.query.webhookEndpoints.findMany({
      where: and(
        eq(webhookEndpoints.workspaceId, input.workspaceId),
        eq(webhookEndpoints.enabled, true),
      ),
    });

    const payload = {
      id: randomBytes(8).toString("hex"),
      event: input.event,
      created_at: new Date().toISOString(),
      data: input.data,
    };
    const body = JSON.stringify(payload);

    for (const endpoint of endpoints) {
      if (!endpoint.events.includes(input.event)) continue;

      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          endpointId: endpoint.id,
          workspaceId: input.workspaceId,
          event: input.event,
          payload,
          status: "pending",
          attempts: 1,
        })
        .returning();

      try {
        const signature = signWebhookPayload(endpoint.secret, body);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MoneyGap-Event": input.event,
            "X-MoneyGap-Signature": signature,
            "User-Agent": "MoneyGap-Webhooks/1.0",
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);

        await db
          .update(webhookDeliveries)
          .set({
            status: res.ok ? "delivered" : "failed",
            responseStatus: res.status,
            deliveredAt: res.ok ? new Date() : null,
            lastError: res.ok ? null : `HTTP ${res.status}`,
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      } catch (err) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "failed",
            lastError: err instanceof Error ? err.message : "Delivery failed",
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      }
    }
  } catch (err) {
    console.error("emitWebhookEvent soft-fail:", err);
  }
}
