import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DIGEST_FREQUENCIES, type DigestFrequency } from "@/lib/email/types";
import {
  getOrCreateEmailPreferences,
  updateEmailPreferences,
} from "@/lib/email/preferences/service";
import { ensureUserAndWorkspace } from "@/lib/analysis/workspace";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await ensureUserAndWorkspace();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const prefs = await getOrCreateEmailPreferences(userId);
    if (user?.email && prefs.email !== user.email) {
      const updated = await updateEmailPreferences(userId, { email: user.email });
      return Response.json({ ok: true, preferences: updated });
    }
    return Response.json({ ok: true, preferences: prefs });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await ensureUserAndWorkspace();
    const body = (await req.json()) as Record<string, unknown>;

    const freq = body.digestFrequency;
    if (
      freq != null &&
      (typeof freq !== "string" ||
        !DIGEST_FREQUENCIES.includes(freq as DigestFrequency))
    ) {
      return Response.json({ ok: false, error: "Invalid digest frequency." }, { status: 400 });
    }

    const prefs = await updateEmailPreferences(userId, {
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      weeklyGrowthDigest:
        typeof body.weeklyGrowthDigest === "boolean"
          ? body.weeklyGrowthDigest
          : undefined,
      aiReadinessUpdates:
        typeof body.aiReadinessUpdates === "boolean"
          ? body.aiReadinessUpdates
          : undefined,
      developerTips:
        typeof body.developerTips === "boolean" ? body.developerTips : undefined,
      productUpdates:
        typeof body.productUpdates === "boolean" ? body.productUpdates : undefined,
      securityNotifications:
        typeof body.securityNotifications === "boolean"
          ? body.securityNotifications
          : undefined,
      monthlyProductSummary:
        typeof body.monthlyProductSummary === "boolean"
          ? body.monthlyProductSummary
          : undefined,
      digestFrequency: freq as DigestFrequency | undefined,
    });

    return Response.json({ ok: true, preferences: prefs });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not save." },
      { status: 400 },
    );
  }
}
