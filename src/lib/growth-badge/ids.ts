import { eq } from "drizzle-orm";
import { db } from "@/db";
import { growthBadges } from "@/db/schema";

function randomSixDigits(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

/** Allocate unique public ID like MG-123456 */
export async function allocatePublicId(maxAttempts = 12): Promise<string> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const publicId = `MG-${randomSixDigits()}`;
    const existing = await db.query.growthBadges.findFirst({
      where: eq(growthBadges.publicId, publicId),
      columns: { id: true },
    });
    if (!existing) return publicId;
  }
  // Extremely unlikely collision path
  const fallback = `MG-${Date.now().toString().slice(-6)}`;
  return fallback;
}
