import { eq } from "drizzle-orm";
import { db } from "@/db";
import { growthBadgeEvents, growthBadges } from "@/db/schema";
import { computeJourney } from "@/lib/growth-badge/journey";
import { badgeStyleLabel } from "@/lib/growth-badge/styles";
import type { VerifyBadgePayload } from "@/lib/growth-badge/types";

const DISCLAIMER =
  "Observed MoneyGap Score™ and journey deltas from MoneyGap AI analysis. AI Estimates — not a legal certification or guaranteed ROI. Always keep a human in the loop.";

export async function verifyBadge(
  publicId: string,
  opts?: { recordView?: boolean },
): Promise<VerifyBadgePayload | null> {
  try {
    const normalized = publicId.trim().toUpperCase();
    const row = await db.query.growthBadges.findFirst({
      where: eq(growthBadges.publicId, normalized),
    });
    // Also try exact case if stored mixed
    const badge =
      row ??
      (await db.query.growthBadges.findFirst({
        where: eq(growthBadges.publicId, publicId.trim()),
      }));
    if (!badge) return null;

    if (opts?.recordView !== false) {
      try {
        await db.insert(growthBadgeEvents).values({
          badgeId: badge.id,
          eventType: "verified_view",
          meta: { publicId: badge.publicId },
        });
      } catch (err) {
        console.error("verifyBadge view event soft-fail", err);
      }
    }

    const journey = computeJourney(badge.beforeScore, badge.afterScore);

    return {
      publicId: badge.publicId,
      verified: badge.status === "active",
      status: badge.status,
      style: badge.style,
      styleLabel: badgeStyleLabel(badge.style),
      websiteName: badge.websiteName,
      domain: badge.domain,
      websiteUrl: badge.websiteUrl,
      moneyGapScore: badge.moneyGapScore,
      analyzedAt: badge.analyzedAt?.toISOString() ?? null,
      issuedAt: badge.issuedAt.toISOString(),
      journey,
      disclaimer: DISCLAIMER,
    };
  } catch (err) {
    console.error("verifyBadge soft-fail", err);
    return null;
  }
}
