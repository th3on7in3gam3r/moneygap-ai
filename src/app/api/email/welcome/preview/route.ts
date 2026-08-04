import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { getOrCreateEmailPreferences } from "@/lib/email/preferences/service";
import {
  WELCOME_SEQUENCE_STEPS,
  buildWelcomePayload,
  getWelcomeStep,
  renderWelcomeStep,
  type WelcomeStepId,
} from "@/lib/email/sequences/welcome";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await ensureUserAndWorkspace();
    const stepParam = new URL(req.url).searchParams.get("step") ?? "day0";
    if (!["day0", "day2", "day7"].includes(stepParam)) {
      return Response.json(
        { ok: false, error: "Invalid step. Use day0, day2, or day7." },
        { status: 400 },
      );
    }
    const stepId = stepParam as WelcomeStepId;
    const step = getWelcomeStep(stepId);
    if (!step) {
      return Response.json({ ok: false, error: "Unknown step." }, { status: 400 });
    }

    const prefs = await getOrCreateEmailPreferences(userId);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const email = prefs.email || user?.email || "";
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

    return Response.json({
      ok: true,
      step: stepId,
      steps: WELCOME_SEQUENCE_STEPS,
      templateKey: step.templateKey,
      channel: step.channel,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      live: process.env.EMAIL_WELCOME_LIVE?.trim() === "1",
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Preview failed" },
      { status: 401 },
    );
  }
}
