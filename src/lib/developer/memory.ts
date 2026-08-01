import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceTechProfiles, type TechStackProfile } from "@/db/schema";

export const TECH_PROFILE_VERSION = "1.0.0";

export async function getTechProfile(workspaceId: string) {
  return db.query.workspaceTechProfiles.findFirst({
    where: eq(workspaceTechProfiles.workspaceId, workspaceId),
  });
}

export async function upsertTechProfile(input: {
  workspaceId: string;
  stack: TechStackProfile;
  sourceRepoId?: string | null;
}) {
  const existing = await getTechProfile(input.workspaceId);
  if (existing) {
    const [row] = await db
      .update(workspaceTechProfiles)
      .set({
        stack: input.stack,
        confidence: input.stack.confidence,
        sourceRepoId: input.sourceRepoId ?? existing.sourceRepoId,
        version: TECH_PROFILE_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(workspaceTechProfiles.id, existing.id))
      .returning();
    return row!;
  }
  const [row] = await db
    .insert(workspaceTechProfiles)
    .values({
      workspaceId: input.workspaceId,
      stack: input.stack,
      confidence: input.stack.confidence,
      sourceRepoId: input.sourceRepoId ?? null,
      version: TECH_PROFILE_VERSION,
    })
    .returning();
  return row!;
}
