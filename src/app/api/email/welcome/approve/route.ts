import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import {
  findDeliveryById,
  updateDelivery,
} from "@/lib/email/analytics/service";
import { getOrCreateEmailPreferences } from "@/lib/email/preferences/service";
import { sendEmail } from "@/lib/email/services/send";
import {
  buildWelcomePayload,
  getWelcomeStep,
  isWelcomeLive,
  renderWelcomeStep,
  type WelcomeStepId,
} from "@/lib/email/sequences/welcome";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";

const bodySchema = z.object({
  deliveryId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await ensureUserAndWorkspace();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Provide deliveryId." },
        { status: 400 },
      );
    }

    const delivery = await findDeliveryById(parsed.data.deliveryId);
    if (!delivery || delivery.userId !== userId) {
      return Response.json({ ok: false, error: "Draft not found." }, { status: 404 });
    }
    if (delivery.status !== "queued") {
      return Response.json(
        { ok: false, error: "Only queued drafts can be approved." },
        { status: 409 },
      );
    }

    const prevMeta = (delivery.meta as Record<string, unknown> | null) ?? {};
    const meta: Record<string, unknown> = {
      ...prevMeta,
      reviewStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    if (!isWelcomeLive()) {
      await updateDelivery({ id: delivery.id, meta });
      return Response.json({
        ok: true,
        sent: false,
        live: false,
        message:
          "Draft marked approved. Set EMAIL_WELCOME_LIVE=1 to send on approve (still human-triggered).",
        deliveryId: delivery.id,
      });
    }

    const stepId = (typeof meta.stepId === "string" ? meta.stepId : null) as WelcomeStepId | null;
    const step = stepId ? getWelcomeStep(stepId) : null;
    if (!step) {
      return Response.json(
        { ok: false, error: "Draft is missing a welcome stepId." },
        { status: 422 },
      );
    }

    const prefs = await getOrCreateEmailPreferences(userId);
    if (step.channel === "product_updates" && !prefs.productUpdates) {
      return Response.json(
        {
          ok: false,
          error:
            "Product updates are off in preferences — enable them before live welcome sends for day2/day7.",
        },
        { status: 422 },
      );
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const email = (prefs.email || user?.email || delivery.toEmail || "").trim();
    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "there";
    const payload = buildWelcomePayload({
      recipientName: name,
      recipientEmail: email,
      unsubscribeToken: prefs.unsubscribeToken,
    });
    const rendered = renderWelcomeStep(step.id, payload);

    const sendResult = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [
        { name: "sequence", value: "welcome" },
        { name: "step", value: step.id },
        { name: "mode", value: "live" },
      ],
    });

    if (!sendResult.ok) {
      log("warn", "welcome_approve_send_soft_fail", {
        userId,
        deliveryId: delivery.id,
        error: sendResult.error,
      });
      await updateDelivery({
        id: delivery.id,
        status: "failed",
        provider: sendResult.provider,
        meta: {
          ...meta,
          error: sendResult.error ?? "send_failed",
        },
      });
      return Response.json(
        {
          ok: false,
          error: sendResult.error ?? "Send failed (soft-fail).",
          live: true,
        },
        { status: 502 },
      );
    }

    await updateDelivery({
      id: delivery.id,
      status: "sent",
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId ?? null,
      sentAt: new Date(),
      meta: { ...meta, draftOnly: false },
    });

    return Response.json({
      ok: true,
      sent: true,
      live: true,
      deliveryId: delivery.id,
      subject: rendered.subject,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Approve failed" },
      { status: 401 },
    );
  }
}
