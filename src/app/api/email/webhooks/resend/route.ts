import {
  findDeliveryByProviderMessageId,
  recordEmailEvent,
  updateDeliveryStatusByProviderId,
} from "@/lib/email/analytics/service";
import type { DeliveryStatus, EmailEventType } from "@/lib/email/types";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

type ResendWebhookEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[];
    subject?: string;
  };
};

function mapEvent(type: string): { event: EmailEventType; status?: DeliveryStatus } | null {
  switch (type) {
    case "email.delivered":
      return { event: "delivered", status: "sent" };
    case "email.opened":
      return { event: "opened" };
    case "email.clicked":
      return { event: "clicked" };
    case "email.bounced":
      return { event: "bounced", status: "bounced" };
    case "email.complained":
      return { event: "complained", status: "complained" };
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = req.headers.get("svix-signature") || req.headers.get("resend-signature");
    // Soft verify: presence check in v1; full Svix crypto can be added later
    if (!header && process.env.NODE_ENV === "production") {
      log("warn", "resend_webhook_missing_signature", {});
    }
  }

  let body: ResendWebhookEvent;
  try {
    body = (await req.json()) as ResendWebhookEvent;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const mapped = body.type ? mapEvent(body.type) : null;
  const messageId = body.data?.email_id;
  if (!mapped || !messageId) {
    return Response.json({ ok: true, ignored: true });
  }

  const delivery = await findDeliveryByProviderMessageId(messageId);
  if (!delivery) {
    return Response.json({ ok: true, unmatched: true });
  }

  await recordEmailEvent({
    deliveryId: delivery.id,
    type: mapped.event,
    payload: body as Record<string, unknown>,
  });

  if (mapped.status) {
    await updateDeliveryStatusByProviderId(messageId, mapped.status);
  }

  return Response.json({ ok: true });
}
