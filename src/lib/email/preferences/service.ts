import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailPreferences, users, type EmailPreference } from "@/db/schema";
import type { DigestFrequency } from "@/lib/email/types";

export function newUnsubscribeToken(): string {
  return randomBytes(24).toString("hex");
}

export async function getOrCreateEmailPreferences(
  userId: string,
): Promise<EmailPreference> {
  const existing = await db.query.emailPreferences.findFirst({
    where: eq(emailPreferences.userId, userId),
  });
  if (existing) return existing;

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const email = user?.email ?? "";
  const [row] = await db
    .insert(emailPreferences)
    .values({
      userId,
      email,
      unsubscribeToken: newUnsubscribeToken(),
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  const again = await db.query.emailPreferences.findFirst({
    where: eq(emailPreferences.userId, userId),
  });
  if (!again) throw new Error("Could not create email preferences.");
  return again;
}

export type EmailPreferencesUpdate = {
  timezone?: string;
  weeklyGrowthDigest?: boolean;
  aiReadinessUpdates?: boolean;
  developerTips?: boolean;
  productUpdates?: boolean;
  securityNotifications?: boolean;
  monthlyProductSummary?: boolean;
  digestFrequency?: DigestFrequency;
  email?: string;
};

export async function updateEmailPreferences(
  userId: string,
  patch: EmailPreferencesUpdate,
): Promise<EmailPreference> {
  await getOrCreateEmailPreferences(userId);
  const [row] = await db
    .update(emailPreferences)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.userId, userId))
    .returning();
  if (!row) throw new Error("Could not update email preferences.");
  return row;
}

export async function findPreferencesByUnsubscribeToken(
  token: string,
): Promise<EmailPreference | null> {
  const row = await db.query.emailPreferences.findFirst({
    where: eq(emailPreferences.unsubscribeToken, token),
  });
  return row ?? null;
}

export async function unsubscribeMarketing(token: string): Promise<EmailPreference | null> {
  const prefs = await findPreferencesByUnsubscribeToken(token);
  if (!prefs) return null;
  const [row] = await db
    .update(emailPreferences)
    .set({
      weeklyGrowthDigest: false,
      aiReadinessUpdates: false,
      developerTips: false,
      productUpdates: false,
      monthlyProductSummary: false,
      digestFrequency: "off",
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.id, prefs.id))
    .returning();
  return row ?? null;
}
