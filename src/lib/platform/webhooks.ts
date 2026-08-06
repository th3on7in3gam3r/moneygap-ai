import { createHmac, randomBytes } from "crypto";
import { and, desc, eq } from "drizzle-orm";
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

const MAX_ATTEMPTS = 3;
/** Delay before attempt N (1-indexed). Attempt 1 is immediate. */
const BACKOFF_MS = [0, 30_000, 120_000] as const;

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function signWebhookPayload(secret: string, body: string) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listWebhookEndpoints(workspaceId: string) {
  return db.query.webhookEndpoints.findMany({
    where: eq(webhookEndpoints.workspaceId, workspaceId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
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

export async function listWebhookDeliveries(
  workspaceId: string,
  opts?: { endpointId?: string; limit?: number },
) {
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
  const rows = await db.query.webhookDeliveries.findMany({
    where: opts?.endpointId
      ? and(
          eq(webhookDeliveries.workspaceId, workspaceId),
          eq(webhookDeliveries.endpointId, opts.endpointId),
        )
      : eq(webhookDeliveries.workspaceId, workspaceId),
    orderBy: [desc(webhookDeliveries.createdAt)],
    limit,
  });
  return rows;
}

/**
 * Single POST attempt for an existing delivery row.
 * Increments attempts and updates status / response / errors.
 */
export async function attemptWebhookDelivery(deliveryId: string): Promise<{
  ok: boolean;
  attempts: number;
  status: string;
}> {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });
  if (!delivery) {
    return { ok: false, attempts: 0, status: "missing" };
  }
  if (delivery.status === "delivered") {
    return { ok: true, attempts: delivery.attempts, status: "delivered" };
  }

  const endpoint = await db.query.webhookEndpoints.findFirst({
    where: eq(webhookEndpoints.id, delivery.endpointId),
  });
  if (!endpoint || !endpoint.enabled) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        lastError: endpoint ? "Endpoint disabled" : "Endpoint missing",
        attempts: delivery.attempts + 1,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return { ok: false, attempts: delivery.attempts + 1, status: "failed" };
  }

  const nextAttempts = delivery.attempts + 1;
  const body = JSON.stringify(delivery.payload);

  try {
    const signature = signWebhookPayload(endpoint.secret, body);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MoneyGap-Event": delivery.event,
        "X-MoneyGap-Signature": signature,
        "User-Agent": "MoneyGap-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          responseStatus: res.status,
          attempts: nextAttempts,
          deliveredAt: new Date(),
          lastError: null,
        })
        .where(eq(webhookDeliveries.id, deliveryId));
      return { ok: true, attempts: nextAttempts, status: "delivered" };
    }

    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        responseStatus: res.status,
        attempts: nextAttempts,
        lastError: `HTTP ${res.status}`,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return { ok: false, attempts: nextAttempts, status: "failed" };
  } catch (err) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        attempts: nextAttempts,
        lastError: err instanceof Error ? err.message : "Delivery failed",
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    return { ok: false, attempts: nextAttempts, status: "failed" };
  }
}

async function scheduleNextRetry(deliveryId: string, attemptsSoFar: number) {
  if (attemptsSoFar >= MAX_ATTEMPTS) return;
  const delay = BACKOFF_MS[attemptsSoFar] ?? 120_000;

  const run = async () => {
    if (delay > 0) await sleep(delay);
    const result = await attemptWebhookDelivery(deliveryId);
    if (!result.ok && result.attempts < MAX_ATTEMPTS) {
      await scheduleNextRetry(deliveryId, result.attempts);
    }
  };

  try {
    const { after } = await import("next/server");
    after(() => {
      void run().catch((err) => {
        console.error("webhook retry soft-fail:", err);
      });
    });
  } catch {
    // Outside a Next request (tests/scripts): best-effort short retry only
    void (async () => {
      await sleep(Math.min(delay, 2_000));
      const result = await attemptWebhookDelivery(deliveryId);
      if (!result.ok && result.attempts < MAX_ATTEMPTS) {
        await scheduleNextRetry(deliveryId, result.attempts);
      }
    })().catch((err) => console.error("webhook retry soft-fail:", err));
  }
}

/** Attempt now + schedule remaining retries with backoff (max 3). */
export async function dispatchWebhookDelivery(deliveryId: string) {
  const result = await attemptWebhookDelivery(deliveryId);
  if (!result.ok && result.attempts < MAX_ATTEMPTS) {
    await scheduleNextRetry(deliveryId, result.attempts);
  }
  return result;
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
          attempts: 0,
        })
        .returning();

      await dispatchWebhookDelivery(delivery.id);
    }
  } catch (err) {
    console.error("emitWebhookEvent soft-fail:", err);
  }
}

/** Manual redeliver — resets to pending and runs the retry pipeline again. */
export async function redeliverWebhookDelivery(
  workspaceId: string,
  deliveryId: string,
) {
  const delivery = await db.query.webhookDeliveries.findFirst({
    where: and(
      eq(webhookDeliveries.id, deliveryId),
      eq(webhookDeliveries.workspaceId, workspaceId),
    ),
  });
  if (!delivery) return null;

  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      lastError: null,
      responseStatus: null,
      deliveredAt: null,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  await dispatchWebhookDelivery(deliveryId);

  return db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });
}
