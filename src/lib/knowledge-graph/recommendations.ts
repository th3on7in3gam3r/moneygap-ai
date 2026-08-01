import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { kgRecommendations, type KgEntryStatus } from "@/db/schema";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";

export async function loadActiveRecommendations(input: {
  industrySlug?: string | null;
  businessModelSlug?: string | null;
  limit?: number;
}) {
  await ensureKnowledgeCatalog();
  const limit = input.limit ?? 8;

  const rows = await db.query.kgRecommendations.findMany({
    where: eq(kgRecommendations.status, "active"),
    orderBy: [desc(kgRecommendations.priority)],
  });

  const matched = rows.filter((r) => {
    if (input.industrySlug && r.industrySlug && r.industrySlug === input.industrySlug) {
      return true;
    }
    if (
      input.businessModelSlug &&
      r.businessModelSlug &&
      r.businessModelSlug === input.businessModelSlug
    ) {
      return true;
    }
    if (!r.industrySlug && !r.businessModelSlug) return true;
    return false;
  });

  const preferred = matched.length > 0 ? matched : rows;
  return preferred.slice(0, limit);
}

export async function setRecommendationStatus(slug: string, status: KgEntryStatus) {
  const [row] = await db
    .update(kgRecommendations)
    .set({ status, updatedAt: new Date() })
    .where(eq(kgRecommendations.slug, slug))
    .returning();
  return row ?? null;
}

export async function updateRecommendation(
  slug: string,
  patch: Partial<{
    status: KgEntryStatus;
    priority: number;
    name: string;
  }>,
) {
  const [row] = await db
    .update(kgRecommendations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(kgRecommendations.slug, slug))
    .returning();
  return row ?? null;
}
