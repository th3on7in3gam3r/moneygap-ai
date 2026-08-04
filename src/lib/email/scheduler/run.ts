import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailPreferences } from "@/db/schema";
import {
  findDeliveryByIdempotencyKey,
  recordDelivery,
} from "@/lib/email/analytics/service";
import { ruleBasedDigestContent } from "@/lib/email/digest/compose";
import {
  digestPeriodKey,
  listDueDigestRecipients,
} from "@/lib/email/scheduler/due";
import { sendEmail } from "@/lib/email/services/send";
import { renderGrowthDigest } from "@/lib/email/templates/growth-digest";
import { log } from "@/lib/observability/logger";

export async function runGrowthDigestJob(input?: {
  dryRun?: boolean;
  limit?: number;
  /** Force a single user (test send) */
  forceUserId?: string;
  forceWorkspaceId?: string;
}) {
  const dryRun = !!input?.dryRun;
  const period = digestPeriodKey();
  let recipients = await listDueDigestRecipients(input?.limit ?? 100);

  if (input?.forceUserId && input.forceWorkspaceId) {
    const prefs = await db.query.emailPreferences.findFirst({
      where: eq(emailPreferences.userId, input.forceUserId),
    });
    if (prefs) {
      recipients = [{ prefs, workspaceId: input.forceWorkspaceId }];
    }
  }

  const results: {
    userId: string;
    status: "sent" | "skipped" | "failed" | "dry_run";
    reason?: string;
  }[] = [];

  for (const { prefs, workspaceId } of recipients) {
    const idempotencyKey = `digest:${prefs.userId}:${period}`;
    const existing = await findDeliveryByIdempotencyKey(idempotencyKey);
    if (existing && !input?.forceUserId) {
      results.push({ userId: prefs.userId, status: "skipped", reason: "already_sent" });
      continue;
    }

    const payload = await ruleBasedDigestContent.buildForUser({
      userId: prefs.userId,
      workspaceId,
      unsubscribeToken: prefs.unsubscribeToken,
    });

    if (!payload) {
      results.push({ userId: prefs.userId, status: "skipped", reason: "no_content" });
      continue;
    }

    const rendered = renderGrowthDigest(payload);

    if (dryRun) {
      results.push({ userId: prefs.userId, status: "dry_run" });
      continue;
    }

    const sendResult = await sendEmail({
      to: payload.recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [
        { name: "channel", value: "weekly_growth_digest" },
        { name: "template", value: "growth_digest" },
      ],
    });

    await recordDelivery({
      userId: prefs.userId,
      workspaceId,
      channel: "weekly_growth_digest",
      templateKey: "growth_digest",
      toEmail: payload.recipientEmail,
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
      status: sendResult.ok ? "sent" : "failed",
      idempotencyKey: input?.forceUserId
        ? `digest-test:${prefs.userId}:${Date.now()}`
        : idempotencyKey,
      subject: rendered.subject,
      meta: { error: sendResult.error, score: payload.score },
    });

    if (sendResult.ok && !input?.forceUserId) {
      await db
        .update(emailPreferences)
        .set({ lastDigestSentAt: new Date(), updatedAt: new Date() })
        .where(eq(emailPreferences.userId, prefs.userId));
      results.push({ userId: prefs.userId, status: "sent" });
    } else if (sendResult.ok) {
      results.push({ userId: prefs.userId, status: "sent" });
    } else {
      log("warn", "growth_digest_send_failed", {
        userId: prefs.userId,
        error: sendResult.error,
      });
      results.push({
        userId: prefs.userId,
        status: "failed",
        reason: sendResult.error,
      });
    }
  }

  return {
    period,
    dueCount: recipients.length,
    results,
  };
}
