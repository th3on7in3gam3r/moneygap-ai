import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  privacyConsentEvents,
  privacyConsentRecords,
} from "@/db/schema";
import type { ConsentCategories } from "./categories";
import { normalizeCategories } from "./categories";
import {
  CONSENT_SCHEMA_VERSION,
  PRIVACY_POLICY_VERSION,
} from "./versions";

export type ConsentSource = "smart_consent" | "privacy_center" | "withdraw";

export type SaveConsentInput = {
  userId: string | null;
  workspaceId: string | null;
  categories: Partial<ConsentCategories>;
  source: ConsentSource;
  regionHint?: string | null;
  visitorKey?: string | null;
};

function diffCategories(
  prev: ConsentCategories | null,
  next: ConsentCategories,
): { enabled: string[]; disabled: string[] } {
  const enabled: string[] = [];
  const disabled: string[] = [];
  const keys = Object.keys(next) as (keyof ConsentCategories)[];
  for (const k of keys) {
    if (k === "essential") continue;
    const was = prev ? Boolean(prev[k]) : false;
    const now = Boolean(next[k]);
    if (!was && now) enabled.push(k);
    if (was && !now) disabled.push(k);
  }
  return { enabled, disabled };
}

export async function getLatestConsent(opts: {
  userId?: string | null;
  workspaceId?: string | null;
  visitorKey?: string | null;
}) {
  if (opts.userId) {
    const row = await db.query.privacyConsentRecords.findFirst({
      where: eq(privacyConsentRecords.userId, opts.userId),
      orderBy: [desc(privacyConsentRecords.updatedAt)],
    });
    if (row) return row;
  }
  if (opts.workspaceId) {
    const row = await db.query.privacyConsentRecords.findFirst({
      where: eq(privacyConsentRecords.workspaceId, opts.workspaceId),
      orderBy: [desc(privacyConsentRecords.updatedAt)],
    });
    if (row) return row;
  }
  if (opts.visitorKey) {
    return db.query.privacyConsentRecords.findFirst({
      where: eq(privacyConsentRecords.visitorKey, opts.visitorKey),
      orderBy: [desc(privacyConsentRecords.updatedAt)],
    });
  }
  return null;
}

export async function listConsentEvents(opts: {
  userId?: string | null;
  workspaceId?: string | null;
  limit?: number;
}) {
  if (opts.userId) {
    return db.query.privacyConsentEvents.findMany({
      where: eq(privacyConsentEvents.userId, opts.userId),
      orderBy: [desc(privacyConsentEvents.createdAt)],
      limit: opts.limit ?? 50,
    });
  }
  if (opts.workspaceId) {
    return db.query.privacyConsentEvents.findMany({
      where: eq(privacyConsentEvents.workspaceId, opts.workspaceId),
      orderBy: [desc(privacyConsentEvents.createdAt)],
      limit: opts.limit ?? 50,
    });
  }
  return [];
}

export async function saveConsent(input: SaveConsentInput) {
  const categories = normalizeCategories(input.categories);
  const prev = await getLatestConsent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    visitorKey: input.visitorKey,
  });
  const { enabled, disabled } = diffCategories(
    prev?.categories ?? null,
    categories,
  );

  let recordId = prev?.id;
  if (prev) {
    await db
      .update(privacyConsentRecords)
      .set({
        categories,
        policyVersion: PRIVACY_POLICY_VERSION,
        consentVersion: CONSENT_SCHEMA_VERSION,
        source: input.source,
        regionHint: input.regionHint ?? prev.regionHint,
        visitorKey: input.visitorKey ?? prev.visitorKey,
        userId: input.userId ?? prev.userId,
        workspaceId: input.workspaceId ?? prev.workspaceId,
        updatedAt: new Date(),
      })
      .where(eq(privacyConsentRecords.id, prev.id));
  } else {
    const [inserted] = await db
      .insert(privacyConsentRecords)
      .values({
        userId: input.userId,
        workspaceId: input.workspaceId,
        visitorKey: input.visitorKey ?? null,
        categories,
        policyVersion: PRIVACY_POLICY_VERSION,
        consentVersion: CONSENT_SCHEMA_VERSION,
        source: input.source,
        regionHint: input.regionHint ?? null,
      })
      .returning();
    recordId = inserted.id;
  }

  await db.insert(privacyConsentEvents).values({
    recordId: recordId ?? null,
    userId: input.userId,
    workspaceId: input.workspaceId,
    eventType: prev ? "consent_updated" : "consent_created",
    categoriesEnabled: enabled,
    categoriesDisabled: disabled,
    categories,
    policyVersion: PRIVACY_POLICY_VERSION,
    consentVersion: CONSENT_SCHEMA_VERSION,
    source: input.source,
  });

  return {
    categories,
    policyVersion: PRIVACY_POLICY_VERSION,
    consentVersion: CONSENT_SCHEMA_VERSION,
    recordId,
  };
}

export async function consentNeedsPrompt(opts: {
  userId?: string | null;
  workspaceId?: string | null;
  visitorKey?: string | null;
  cookieVersion?: string | null;
}): Promise<boolean> {
  if (
    opts.cookieVersion &&
    opts.cookieVersion === CONSENT_SCHEMA_VERSION
  ) {
    return false;
  }
  const row = await getLatestConsent(opts);
  if (!row) return true;
  return row.consentVersion !== CONSENT_SCHEMA_VERSION;
}
