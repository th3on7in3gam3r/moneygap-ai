import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { competitorSnapshots, competitors } from "@/db/schema";
import type { CompetitorSnapshotSignals } from "@/db/schema";

export async function writeCompetitorSnapshots(input: {
  websiteId: string;
  reportId: string;
}) {
  const rows = await db.query.competitors.findMany({
    where: eq(competitors.reportId, input.reportId),
  });

  if (rows.length === 0) return [];

  const values = rows.map((c) => {
    const profile = c.profile as Record<string, unknown> | null;
    const signals: CompetitorSnapshotSignals = {
      summary: c.businessSummary,
      content: Array.isArray(profile?.contentThemes)
        ? (profile.contentThemes as string[]).slice(0, 5)
        : undefined,
      products: Array.isArray(profile?.products)
        ? (profile.products as string[]).slice(0, 5)
        : undefined,
      offers: Array.isArray(profile?.offers)
        ? (profile.offers as string[]).slice(0, 5)
        : undefined,
    };
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          domain: c.domain,
          summary: c.businessSummary,
          profile: c.profile,
        }),
      )
      .digest("hex")
      .slice(0, 32);

    return {
      competitorId: c.id,
      websiteId: input.websiteId,
      reportId: input.reportId,
      fingerprint,
      signals,
    };
  });

  return db.insert(competitorSnapshots).values(values).returning();
}
