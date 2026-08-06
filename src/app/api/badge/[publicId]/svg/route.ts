import { db } from "@/db";
import { growthBadgeEvents } from "@/db/schema";
import { getBadgeByPublicId, renderBadgeSvg } from "@/lib/growth-badge";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await ctx.params;
  const id = publicId?.trim() ?? "";

  try {
    const badge =
      (await getBadgeByPublicId(id)) ??
      (await getBadgeByPublicId(id.toUpperCase()));
    if (!badge || badge.status === "revoked") {
      const svg = renderBadgeSvg({
        style: "growth_optimized",
        revoked: true,
      });
      return new Response(svg, {
        status: badge ? 200 : 404,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    try {
      await db.insert(growthBadgeEvents).values({
        badgeId: badge.id,
        eventType: "embed_served",
        meta: { publicId: badge.publicId },
      });
    } catch (err) {
      console.error("embed_served soft-fail", err);
    }

    const svg = renderBadgeSvg({
      style: badge.style,
      score: badge.moneyGapScore,
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (err) {
    console.error("badge svg soft-fail", err);
    const svg = renderBadgeSvg({ style: "growth_optimized", revoked: true });
    return new Response(svg, {
      status: 500,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }
}
