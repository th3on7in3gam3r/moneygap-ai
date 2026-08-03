import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  growthBadgeEvents,
  growthBadges,
  reports,
  scoreSnapshots,
  websites,
  type GrowthBadge,
  type GrowthBadgeStyle,
} from "@/db/schema";
import { createEmbedCode, badgeSvgUrl, badgeVerifyUrl } from "@/lib/growth-badge/embed";
import { allocatePublicId } from "@/lib/growth-badge/ids";
import { badgeStyleLabel } from "@/lib/growth-badge/styles";
import type { GrowthBadgeDto } from "@/lib/growth-badge/types";

export function toBadgeDto(row: GrowthBadge): GrowthBadgeDto {
  return {
    id: row.id,
    publicId: row.publicId,
    workspaceId: row.workspaceId,
    websiteId: row.websiteId,
    style: row.style,
    status: row.status,
    issuedAt: row.issuedAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    domain: row.domain,
    websiteUrl: row.websiteUrl,
    websiteName: row.websiteName,
    moneyGapScore: row.moneyGapScore,
    reportId: row.reportId,
    analyzedAt: row.analyzedAt?.toISOString() ?? null,
    beforeScore: row.beforeScore,
    afterScore: row.afterScore,
    improvementPoints: row.improvementPoints,
    styleLabel: badgeStyleLabel(row.style),
    verifyUrl: badgeVerifyUrl(row.publicId),
    svgUrl: badgeSvgUrl(row.publicId),
    embedHtml: createEmbedCode(row.publicId, row.style),
  };
}

async function latestReportForWebsite(websiteId: string) {
  try {
    return await db.query.reports.findFirst({
      where: eq(reports.websiteId, websiteId),
      orderBy: [desc(reports.createdAt)],
    });
  } catch {
    return null;
  }
}

export async function generateBadge(input: {
  workspaceId: string;
  websiteId: string;
  style: GrowthBadgeStyle;
}): Promise<{ ok: true; badge: GrowthBadgeDto } | { ok: false; error: string }> {
  try {
    const site = await db.query.websites.findFirst({
      where: and(
        eq(websites.id, input.websiteId),
        eq(websites.workspaceId, input.workspaceId),
      ),
    });
    if (!site) return { ok: false, error: "Website not found" };

    const report = await latestReportForWebsite(site.id);
    const publicId = await allocatePublicId();

    const [row] = await db
      .insert(growthBadges)
      .values({
        publicId,
        workspaceId: input.workspaceId,
        websiteId: site.id,
        style: input.style,
        status: "active",
        domain: site.domain,
        websiteUrl: site.url,
        websiteName: site.name,
        moneyGapScore: report?.moneyGapScore ?? null,
        reportId: report?.id ?? null,
        analyzedAt: report?.createdAt ?? null,
      })
      .returning();

    if (!row) return { ok: false, error: "Could not create badge" };

    try {
      await db.insert(growthBadgeEvents).values({
        badgeId: row.id,
        eventType: "issued",
        meta: { style: input.style, publicId },
      });
    } catch (err) {
      console.error("growth-badge event issued soft-fail", err);
    }

    // Best-effort journey seed
    try {
      const { trackGrowth } = await import("@/lib/growth-badge/journey");
      await trackGrowth(row.id);
      const refreshed = await db.query.growthBadges.findFirst({
        where: eq(growthBadges.id, row.id),
      });
      if (refreshed) return { ok: true, badge: toBadgeDto(refreshed) };
    } catch (err) {
      console.error("growth-badge journey seed soft-fail", err);
    }

    return { ok: true, badge: toBadgeDto(row) };
  } catch (err) {
    console.error("generateBadge soft-fail", err);
    return { ok: false, error: "Could not create Growth Badge™" };
  }
}

export async function listBadgesForWorkspace(
  workspaceId: string,
): Promise<GrowthBadgeDto[]> {
  try {
    const rows = await db.query.growthBadges.findMany({
      where: eq(growthBadges.workspaceId, workspaceId),
      orderBy: [desc(growthBadges.issuedAt)],
    });
    return rows.map(toBadgeDto);
  } catch (err) {
    console.error("listBadgesForWorkspace soft-fail", err);
    return [];
  }
}

export async function revokeBadge(input: {
  workspaceId: string;
  publicId: string;
}): Promise<{ ok: true; badge: GrowthBadgeDto } | { ok: false; error: string }> {
  try {
    const row = await db.query.growthBadges.findFirst({
      where: and(
        eq(growthBadges.publicId, input.publicId),
        eq(growthBadges.workspaceId, input.workspaceId),
      ),
    });
    if (!row) return { ok: false, error: "Badge not found" };

    const [updated] = await db
      .update(growthBadges)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(growthBadges.id, row.id))
      .returning();

    try {
      await db.insert(growthBadgeEvents).values({
        badgeId: row.id,
        eventType: "revoked",
        meta: { publicId: input.publicId },
      });
    } catch (err) {
      console.error("growth-badge revoke event soft-fail", err);
    }

    return { ok: true, badge: toBadgeDto(updated ?? { ...row, status: "revoked" }) };
  } catch (err) {
    console.error("revokeBadge soft-fail", err);
    return { ok: false, error: "Could not revoke badge" };
  }
}

export async function getBadgeByPublicId(publicId: string) {
  try {
    return await db.query.growthBadges.findFirst({
      where: eq(growthBadges.publicId, publicId),
    });
  } catch {
    return null;
  }
}

/** Used by journey — earliest/latest scores for a website */
export async function scoreRangeForWebsite(websiteId: string): Promise<{
  before: number | null;
  after: number | null;
}> {
  try {
    const snaps = await db.query.scoreSnapshots.findMany({
      where: eq(scoreSnapshots.websiteId, websiteId),
      orderBy: [asc(scoreSnapshots.createdAt)],
      columns: { moneyGapScore: true },
      limit: 50,
    });
    if (snaps.length >= 1) {
      const before = snaps[0]?.moneyGapScore ?? null;
      const after = snaps[snaps.length - 1]?.moneyGapScore ?? before;
      return { before, after };
    }
  } catch (err) {
    console.error("scoreRange snapshots soft-fail", err);
  }

  try {
    const oldest = await db.query.reports.findFirst({
      where: eq(reports.websiteId, websiteId),
      orderBy: [asc(reports.createdAt)],
      columns: { moneyGapScore: true },
    });
    const newest = await db.query.reports.findFirst({
      where: eq(reports.websiteId, websiteId),
      orderBy: [desc(reports.createdAt)],
      columns: { moneyGapScore: true },
    });
    return {
      before: oldest?.moneyGapScore ?? null,
      after: newest?.moneyGapScore ?? null,
    };
  } catch (err) {
    console.error("scoreRange reports soft-fail", err);
    return { before: null, after: null };
  }
}
