import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { emailDeliveries, emailEvents } from "@/db/schema";
import type { DeliveryStatus, EmailChannel, EmailEventType } from "@/lib/email/types";

export async function recordDelivery(input: {
  userId?: string | null;
  workspaceId?: string | null;
  channel: EmailChannel | string;
  templateKey: string;
  toEmail: string;
  provider: string;
  providerMessageId?: string | null;
  status: DeliveryStatus;
  idempotencyKey: string;
  subject: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const [row] = await db
      .insert(emailDeliveries)
      .values({
        userId: input.userId ?? null,
        workspaceId: input.workspaceId ?? null,
        channel: input.channel,
        templateKey: input.templateKey,
        toEmail: input.toEmail,
        provider: input.provider,
        providerMessageId: input.providerMessageId ?? null,
        status: input.status,
        idempotencyKey: input.idempotencyKey,
        subject: input.subject,
        meta: input.meta ?? {},
        sentAt: input.status === "sent" ? new Date() : null,
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  } catch {
    return null;
  }
}

export async function findDeliveryByIdempotencyKey(key: string) {
  return (
    (await db.query.emailDeliveries.findFirst({
      where: eq(emailDeliveries.idempotencyKey, key),
    })) ?? null
  );
}

export async function listRecentDeliveries(userId: string, limit = 20) {
  return db.query.emailDeliveries.findMany({
    where: eq(emailDeliveries.userId, userId),
    orderBy: [desc(emailDeliveries.createdAt)],
    limit,
  });
}

export async function recordEmailEvent(input: {
  deliveryId: string;
  type: EmailEventType;
  payload?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(emailEvents)
    .values({
      deliveryId: input.deliveryId,
      type: input.type,
      payload: input.payload ?? {},
    })
    .returning();
  return row;
}

export async function updateDeliveryStatusByProviderId(
  providerMessageId: string,
  status: DeliveryStatus,
) {
  await db
    .update(emailDeliveries)
    .set({ status })
    .where(eq(emailDeliveries.providerMessageId, providerMessageId));
}

export async function findDeliveryByProviderMessageId(providerMessageId: string) {
  return (
    (await db.query.emailDeliveries.findFirst({
      where: eq(emailDeliveries.providerMessageId, providerMessageId),
    })) ?? null
  );
}
