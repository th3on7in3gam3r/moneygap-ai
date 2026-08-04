import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { recordDelivery } from "@/lib/email/analytics/service";
import { getOrCreateEmailPreferences } from "@/lib/email/preferences/service";
import { sendEmail } from "@/lib/email/services/send";
import {
  buildWelcomePayload,
  getWelcomeStep,
  renderWelcomeStep,
  type WelcomeStepId,
} from "@/lib/email/sequences/welcome";
import { log } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  step: z.enum(["day0", "day2", "day7"]),
});

export async function POST(req: Request) {
  try {
    const { userId, workspace } = await ensureUserAndWorkspace();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Provide step: day0 | day2 | day7." },
        { status: 400 },
      );
    }

    const limit = checkRateLimit({
      key: `welcome-test:${userId}`,
      limit: 6,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.ok) {
      return Response.json(
        { ok: false, error: "Test send rate limit — try again later." },
        { status: 429 },
      );
    }

    const stepId = parsed.data.step as WelcomeStepId;
    const step = getWelcomeStep(stepId)!;
    const prefs = await getOrCreateEmailPreferences(userId);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const email = (prefs.email || user?.email || "").trim();
    if (!email) {
      return Response.json(
        { ok: false, error: "No email on your account." },
        { status: 422 },
      );
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
    const rendered = renderWelcomeStep(stepId, payload);
    const day = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `welcome-test:${userId}:${step.templateKey}:${day}`;

    const sendResult = await sendEmail({
      to: email,
      subject: `[Test] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      tags: [
        { name: "sequence", value: "welcome" },
        { name: "step", value: stepId },
        { name: "mode", value: "test" },
      ],
    });

    await recordDelivery({
      userId,
      workspaceId: workspace.id,
      channel: step.channel,
      templateKey: step.templateKey,
      toEmail: email,
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId ?? null,
      status: sendResult.ok ? "sent" : "failed",
      idempotencyKey,
      subject: `[Test] ${rendered.subject}`,
      meta: {
        reviewStatus: "test",
        sequence: "welcome",
        stepId,
        site: "moneygap-ai.com",
        testSend: true,
        ...(sendResult.ok ? {} : { error: sendResult.error ?? "send_failed" }),
      },
    });

    if (!sendResult.ok) {
      log("warn", "welcome_test_send_soft_fail", {
        userId,
        step: stepId,
        error: sendResult.error,
      });
      return Response.json(
        {
          ok: false,
          error: sendResult.error ?? "Email send failed (soft-fail).",
          subject: rendered.subject,
        },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      sent: true,
      to: email,
      step: stepId,
      subject: rendered.subject,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Test send failed" },
      { status: 401 },
    );
  }
}
