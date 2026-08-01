import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import type { IndustryPlaybookSnapshot } from "@/db/schema";
import { kgPlaybooks } from "@/db/schema";
import type { ClassificationResult } from "@/lib/knowledge-graph/classify";
import { ensureKnowledgeCatalog } from "@/lib/knowledge-graph/ensure-catalog";
import { getPatternNameMap } from "@/lib/knowledge-graph/pattern-match";
import { isActiveStatus } from "@/lib/knowledge-graph/taxonomy";

export async function resolveIndustryPlaybook(
  classification: ClassificationResult,
): Promise<IndustryPlaybookSnapshot | null> {
  await ensureKnowledgeCatalog();

  let row = null as typeof kgPlaybooks.$inferSelect | null | undefined;

  if (classification.industrySlug) {
    row = await db.query.kgPlaybooks.findFirst({
      where: and(
        eq(kgPlaybooks.industrySlug, classification.industrySlug),
        eq(kgPlaybooks.status, "active"),
      ),
    });
    if (!row) {
      row = await db.query.kgPlaybooks.findFirst({
        where: eq(kgPlaybooks.industrySlug, classification.industrySlug),
      });
    }
  }

  if ((!row || row.status === "deprecated") && classification.businessModelSlug) {
    row = await db.query.kgPlaybooks.findFirst({
      where: eq(kgPlaybooks.businessModelSlug, classification.businessModelSlug),
    });
  }

  if (!row || !isActiveStatus(row.status) || row.status === "deprecated") {
    return null;
  }

  const names = await getPatternNameMap();
  const patternSlugs =
    row.patternSlugs && row.patternSlugs.length > 0
      ? row.patternSlugs
      : [
          ...new Set(
            row.steps.map((s) => s.patternSlug).filter((s): s is string => Boolean(s)),
          ),
        ];

  return {
    slug: row.slug,
    name: row.name,
    industrySlug: row.industrySlug,
    businessModelSlug: row.businessModelSlug,
    patternSlugs,
    steps: [...row.steps]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        ...s,
        patternName: s.patternSlug ? names[s.patternSlug] : undefined,
      })),
  };
}
