import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  businessMemoryEntries,
  type BusinessMemoryKind,
} from "@/db/schema";

export async function listMemoryEntries(workspaceId: string, limit = 80) {
  try {
    return await db.query.businessMemoryEntries.findMany({
      where: eq(businessMemoryEntries.workspaceId, workspaceId),
      orderBy: [desc(businessMemoryEntries.updatedAt)],
      limit,
    });
  } catch {
    return [];
  }
}

export async function upsertMemoryEntry(input: {
  workspaceId: string;
  kind: BusinessMemoryKind;
  key: string;
  value: Record<string, unknown>;
  source?: string;
  confidence?: number | null;
  id?: string;
}) {
  if (input.id) {
    const [row] = await db
      .update(businessMemoryEntries)
      .set({
        kind: input.kind,
        key: input.key,
        value: input.value,
        source: input.source ?? "user",
        confidence: input.confidence ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessMemoryEntries.id, input.id),
          eq(businessMemoryEntries.workspaceId, input.workspaceId),
        ),
      )
      .returning();
    return row ?? null;
  }

  const [row] = await db
    .insert(businessMemoryEntries)
    .values({
      workspaceId: input.workspaceId,
      kind: input.kind,
      key: input.key,
      value: input.value,
      source: input.source ?? "user",
      confidence: input.confidence ?? null,
    })
    .returning();
  return row!;
}

export function formatMemoryForPrompt(
  entries: Awaited<ReturnType<typeof listMemoryEntries>>,
): string {
  if (!entries.length) return "(no Business Memory entries yet)";
  return entries
    .slice(0, 40)
    .map((e) => {
      const text =
        typeof e.value?.text === "string"
          ? e.value.text
          : JSON.stringify(e.value);
      return `- [${e.kind}] ${e.key}: ${text}`;
    })
    .join("\n");
}
