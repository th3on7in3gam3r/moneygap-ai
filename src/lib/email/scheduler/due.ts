import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { emailPreferences, workspaceMembers, type EmailPreference } from "@/db/schema";
import type { DigestFrequency } from "@/lib/email/types";

function startOfLocalDay(d: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  // Approximate UTC instant for that local calendar day at noon UTC offset-safe compare
  return new Date(`${y}-${m}-${day}T12:00:00.000Z`);
}

function localWeekday(d: Date, timeZone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 1;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Weekly digests go out on Monday local time.
 * Biweekly: Monday every 14+ days since last send.
 * Monthly: 1st of month local, and 28+ days since last (or never).
 */
export function isDigestDue(
  prefs: Pick<
    EmailPreference,
    "weeklyGrowthDigest" | "digestFrequency" | "timezone" | "lastDigestSentAt"
  >,
  now = new Date(),
): boolean {
  if (!prefs.weeklyGrowthDigest) return false;
  const freq = prefs.digestFrequency as DigestFrequency;
  if (freq === "off") return false;

  const tz = prefs.timezone || "UTC";
  const weekday = localWeekday(now, tz);
  const last = prefs.lastDigestSentAt;

  if (freq === "weekly") {
    if (weekday !== 1) return false; // Monday
    if (!last) return true;
    return daysBetween(last, now) >= 6;
  }

  if (freq === "biweekly") {
    if (weekday !== 1) return false;
    if (!last) return true;
    return daysBetween(last, now) >= 13;
  }

  if (freq === "monthly") {
    const day = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" }).format(now),
    );
    if (day !== 1) return false;
    if (!last) return true;
    return daysBetween(last, now) >= 27;
  }

  return false;
}

export function digestPeriodKey(now = new Date()): string {
  return startOfLocalDay(now, "UTC").toISOString().slice(0, 10);
}

export type DueDigestRecipient = {
  prefs: EmailPreference;
  workspaceId: string;
};

export async function listDueDigestRecipients(limit = 100): Promise<DueDigestRecipient[]> {
  const rows = await db.query.emailPreferences.findMany({
    where: and(
      eq(emailPreferences.weeklyGrowthDigest, true),
      ne(emailPreferences.digestFrequency, "off"),
      isNotNull(emailPreferences.email),
    ),
    limit: 500,
  });

  const due: DueDigestRecipient[] = [];
  for (const prefs of rows) {
    if (!isDigestDue(prefs)) continue;
    const membership = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.userId, prefs.userId),
    });
    if (!membership) continue;
    due.push({ prefs, workspaceId: membership.workspaceId });
    if (due.length >= limit) break;
  }
  return due;
}
