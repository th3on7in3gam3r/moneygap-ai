import { eq } from "drizzle-orm";
import { db } from "@/db";
import { growthBadgeEvents, growthBadges } from "@/db/schema";
import { scoreRangeForWebsite } from "@/lib/growth-badge/generate";
import { toBadgeDto } from "@/lib/growth-badge/generate";
import type { GrowthBadgeDto, GrowthJourney } from "@/lib/growth-badge/types";

export function computeJourney(
  before: number | null,
  after: number | null,
): GrowthJourney {
  if (before == null || after == null) {
    return {
      beforeScore: before,
      afterScore: after,
      improvementPoints: null,
      improvementPercent: null,
    };
  }
  const points = after - before;
  const improvementPercent =
    before === 0 ? null : Math.round((points / Math.abs(before)) * 1000) / 10;
  return {
    beforeScore: before,
    afterScore: after,
    improvementPoints: points,
    improvementPercent,
  };
}

export async function trackGrowth(
  badgeId: string,
): Promise<
  { ok: true; badge: GrowthBadgeDto; journey: GrowthJourney } | { ok: false; error: string }
> {
  try {
    const row = await db.query.growthBadges.findFirst({
      where: eq(growthBadges.id, badgeId),
    });
    if (!row) return { ok: false, error: "Badge not found" };

    const { before, after } = await scoreRangeForWebsite(row.websiteId);
    const journey = computeJourney(before, after);

    // Also refresh current observed score from latest after
    const [updated] = await db
      .update(growthBadges)
      .set({
        beforeScore: journey.beforeScore,
        afterScore: journey.afterScore,
        improvementPoints: journey.improvementPoints,
        moneyGapScore: journey.afterScore ?? row.moneyGapScore,
        updatedAt: new Date(),
      })
      .where(eq(growthBadges.id, badgeId))
      .returning();

    try {
      await db.insert(growthBadgeEvents).values({
        badgeId,
        eventType: "journey_updated",
        meta: journey as unknown as Record<string, unknown>,
      });
    } catch (err) {
      console.error("trackGrowth event soft-fail", err);
    }

    const badge = toBadgeDto(updated ?? row);
    return { ok: true, badge, journey };
  } catch (err) {
    console.error("trackGrowth soft-fail", err);
    return { ok: false, error: "Could not update Growth Journey" };
  }
}

export async function trackGrowthByPublicId(
  workspaceId: string,
  publicId: string,
) {
  const row = await db.query.growthBadges.findFirst({
    where: eq(growthBadges.publicId, publicId),
  });
  if (!row || row.workspaceId !== workspaceId) {
    return { ok: false as const, error: "Badge not found" };
  }
  return trackGrowth(row.id);
}
