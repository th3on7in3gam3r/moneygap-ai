import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  integrationConnections,
  integrationCredentials,
} from "@/db/schema";
import { decryptCredentials, isEncryptionConfigured } from "@/lib/integrations/crypto";

export const PULSE_SCRIPT_SRC = "https://pulse-5o1m.onrender.com/pulse.js";
export const PULSE_SITE_ID = "moneygap-ai-com";
export const PULSE_PROVIDER_SLUG = "cadence_pulse";

const CACHE_TTL_MS = 60_000;

let collectKeyCache: { value: string | undefined; at: number } | null = null;

export function isPulseCollectKey(value: string): boolean {
  return /^pck_[A-Za-z0-9_-]{8,}$/.test(value.trim());
}

export function invalidatePulseCollectKeyCache() {
  collectKeyCache = null;
}

/**
 * Collect key for the public site pixel (`data-key` on pulse.js).
 * Prefers host env; falls back to a connected Cadence Pulse Integration Hub key.
 */
export async function resolvePulseCollectKey(): Promise<string | undefined> {
  const fromEnv =
    process.env.NEXT_PUBLIC_PULSE_DATA_KEY?.trim() ||
    process.env.PULSE_DATA_KEY?.trim();
  if (fromEnv) return fromEnv;

  if (collectKeyCache && Date.now() - collectKeyCache.at < CACHE_TTL_MS) {
    return collectKeyCache.value;
  }

  let value: string | undefined;
  try {
    if (!isEncryptionConfigured()) {
      collectKeyCache = { value: undefined, at: Date.now() };
      return undefined;
    }
    const conn = await db.query.integrationConnections.findFirst({
      where: and(
        eq(integrationConnections.providerSlug, PULSE_PROVIDER_SLUG),
        eq(integrationConnections.status, "connected"),
      ),
    });
    if (conn) {
      const row = await db.query.integrationCredentials.findFirst({
        where: eq(integrationCredentials.connectionId, conn.id),
      });
      if (row) {
        const creds = decryptCredentials({
          ciphertext: row.ciphertext,
          iv: row.iv,
        });
        const key = creds.apiKey?.trim();
        if (key && isPulseCollectKey(key)) value = key;
      }
    }
  } catch {
    value = undefined;
  }

  collectKeyCache = { value, at: Date.now() };
  return value;
}

export async function getPulseEmbedConfig(): Promise<{
  src: string;
  site: string;
  dataKey: string | undefined;
}> {
  return {
    src: PULSE_SCRIPT_SRC,
    site: process.env.NEXT_PUBLIC_PULSE_SITE?.trim() || PULSE_SITE_ID,
    dataKey: await resolvePulseCollectKey(),
  };
}
