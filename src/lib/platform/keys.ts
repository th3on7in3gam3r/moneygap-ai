import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, type ApiKeyScope } from "@/db/schema";
import { requireFeature } from "@/lib/billing";

export type ApiEnvironment = "development" | "production";

const DEFAULT_SCOPES: ApiKeyScope[] = ["analyze", "read", "webhooks"];

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(environment: ApiEnvironment) {
  const prefix = environment === "production" ? "mg_live_" : "mg_test_";
  const secret = randomBytes(24).toString("base64url");
  const raw = `${prefix}${secret}`;
  return {
    raw,
    keyPrefix: raw.slice(0, 12),
    keyHash: hashApiKey(raw),
    environment,
  };
}

export async function createApiKey(input: {
  workspaceId: string;
  name: string;
  environment: ApiEnvironment;
  scopes?: ApiKeyScope[];
  createdBy?: string | null;
  rateLimitPerMinute?: number;
}) {
  const feature = await requireFeature(input.workspaceId, "api_access");
  if (!feature.ok) return { ok: false as const, denied: feature };

  const generated = generateApiKey(input.environment);
  const [row] = await db
    .insert(apiKeys)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      environment: input.environment,
      scopes: input.scopes ?? DEFAULT_SCOPES,
      rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  return {
    ok: true as const,
    key: row,
    secret: generated.raw,
  };
}

export async function listApiKeys(workspaceId: string) {
  return db.query.apiKeys.findMany({
    where: and(eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.revokedAt)),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function revokeApiKey(workspaceId: string, keyId: string) {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function rotateApiKey(input: {
  workspaceId: string;
  keyId: string;
  createdBy?: string | null;
}) {
  const existing = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, input.keyId),
      eq(apiKeys.workspaceId, input.workspaceId),
      isNull(apiKeys.revokedAt),
    ),
  });
  if (!existing) return { ok: false as const, error: "Key not found" };

  await revokeApiKey(input.workspaceId, input.keyId);
  return createApiKey({
    workspaceId: input.workspaceId,
    name: `${existing.name} (rotated)`,
    environment: existing.environment as ApiEnvironment,
    scopes: existing.scopes,
    createdBy: input.createdBy,
    rateLimitPerMinute: existing.rateLimitPerMinute,
  });
}

export async function findApiKeyByRaw(raw: string) {
  const keyHash = hashApiKey(raw.trim());
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)),
  });
  return key ?? null;
}

export function keyHasScope(
  scopes: ApiKeyScope[] | null | undefined,
  scope: ApiKeyScope,
) {
  return (scopes ?? []).includes(scope);
}

export function safeEqualHash(a: string, b: string) {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
