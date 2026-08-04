import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";
import { ruleBasedDigestContent } from "@/lib/email/digest/compose";
import { getOrCreateEmailPreferences } from "@/lib/email/preferences/service";
import { renderGrowthDigest } from "@/lib/email/templates/growth-digest";
import { runGrowthDigestJob } from "@/lib/email/scheduler/run";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, workspace } = await ensureUserAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { send?: boolean };
    const prefs = await getOrCreateEmailPreferences(userId);

    const payload = await ruleBasedDigestContent.buildForUser({
      userId,
      workspaceId: workspace.id,
      unsubscribeToken: prefs.unsubscribeToken,
    });

    if (!payload) {
      return Response.json(
        { ok: false, error: "No digest content available yet. Run a website analysis first." },
        { status: 422 },
      );
    }

    const rendered = renderGrowthDigest(payload);

    if (body.send) {
      const limit = checkRateLimit({
        key: `digest-test:${userId}`,
        limit: 3,
        windowMs: 60 * 60 * 1000,
      });
      if (!limit.ok) {
        return Response.json(
          { ok: false, error: "Test send rate limit — try again later." },
          { status: 429 },
        );
      }
      const result = await runGrowthDigestJob({
        forceUserId: userId,
        forceWorkspaceId: workspace.id,
      });
      return Response.json({
        ok: true,
        sent: true,
        subject: rendered.subject,
        result,
      });
    }

    return Response.json({
      ok: true,
      sent: false,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      payload,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Preview failed" },
      { status: 401 },
    );
  }
}
