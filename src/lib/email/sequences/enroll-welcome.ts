import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  findDeliveryByIdempotencyKey,
  recordDelivery,
} from "@/lib/email/analytics/service";
import { getOrCreateEmailPreferences } from "@/lib/email/preferences/service";
import { log } from "@/lib/observability/logger";
import {
  WELCOME_SEQUENCE_STEPS,
  buildWelcomePayload,
  renderWelcomeStep,
} from "@/lib/email/sequences/welcome";

/**
 * Queue draft welcome/nurture deliveries for a new MoneyGap user.
 * Never calls Resend — drafts only until human review / EMAIL_WELCOME_LIVE.
 */
export async function enrollWelcomeSequence(input: {
  userId: string;
  workspaceId: string;
}): Promise<{ enrolled: boolean; queued: number }> {
  try {
    const prefs = await getOrCreateEmailPreferences(input.userId);
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    const email = (prefs.email || user?.email || "").trim();
    if (!email) {
      log("warn", "welcome_enroll_skipped_no_email", { userId: input.userId });
      return { enrolled: false, queued: 0 };
    }

    const name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "there";

    const payload = buildWelcomePayload({
      recipientName: name,
      recipientEmail: email,
      unsubscribeToken: prefs.unsubscribeToken,
    });

    let queued = 0;
    for (const step of WELCOME_SEQUENCE_STEPS) {
      const idempotencyKey = `welcome:${input.userId}:${step.templateKey}`;
      const existing = await findDeliveryByIdempotencyKey(idempotencyKey);
      if (existing) continue;

      const rendered = renderWelcomeStep(step.id, payload);
      const row = await recordDelivery({
        userId: input.userId,
        workspaceId: input.workspaceId,
        channel: step.channel,
        templateKey: step.templateKey,
        toEmail: email,
        provider: "none",
        status: "queued",
        idempotencyKey,
        subject: rendered.subject,
        meta: {
          reviewStatus: "pending",
          sequence: "welcome",
          stepId: step.id,
          offsetDays: step.offsetDays,
          site: "moneygap-ai.com",
          draftOnly: true,
        },
      });
      if (row) queued += 1;
    }

    log("info", "welcome_enroll_queued", {
      userId: input.userId,
      workspaceId: input.workspaceId,
      queued,
    });
    return { enrolled: queued > 0, queued };
  } catch (err) {
    log("warn", "welcome_enroll_soft_fail", {
      userId: input.userId,
      error: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    return { enrolled: false, queued: 0 };
  }
}
