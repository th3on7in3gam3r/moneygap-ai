import { eq } from "drizzle-orm";
import { db } from "@/db";
import { selfOptimizationMetadataDrafts } from "@/db/schema";

/**
 * Confirm apply: marks draft applied and returns copy-ready snippet.
 * Never mutates production marketing files automatically.
 */
export async function confirmMetadataApply(draftId: string, workspaceId: string) {
  const [draft] = await db
    .select()
    .from(selfOptimizationMetadataDrafts)
    .where(eq(selfOptimizationMetadataDrafts.id, draftId))
    .limit(1);
  if (!draft || draft.workspaceId !== workspaceId) {
    return { ok: false as const, error: "Draft not found" };
  }
  if (draft.status === "rejected") {
    return { ok: false as const, error: "Draft was rejected" };
  }

  const [updated] = await db
    .update(selfOptimizationMetadataDrafts)
    .set({ status: "applied", updatedAt: new Date() })
    .where(eq(selfOptimizationMetadataDrafts.id, draftId))
    .returning();

  return {
    ok: true as const,
    draft: updated,
    message:
      "Draft marked applied. Paste the snippet into your marketing layout or metadata export — MoneyGap never auto-publishes.",
    snippet: updated.snippet,
  };
}

export async function rejectMetadataDraft(draftId: string, workspaceId: string) {
  const [draft] = await db
    .select()
    .from(selfOptimizationMetadataDrafts)
    .where(eq(selfOptimizationMetadataDrafts.id, draftId))
    .limit(1);
  if (!draft || draft.workspaceId !== workspaceId) {
    return { ok: false as const, error: "Draft not found" };
  }
  const [updated] = await db
    .update(selfOptimizationMetadataDrafts)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(selfOptimizationMetadataDrafts.id, draftId))
    .returning();
  return { ok: true as const, draft: updated };
}
