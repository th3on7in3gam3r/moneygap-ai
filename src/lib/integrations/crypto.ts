import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "crypto";
import type { IntegrationCredentialPayload } from "@/db/schema";

const ALGO = "aes-256-gcm";
const KEY_VERSION = 1;

export class IntegrationCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationCryptoError";
  }
}

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) {
    throw new IntegrationCryptoError(
      "INTEGRATION_ENCRYPTION_KEY is not configured (32-byte key, base64-encoded)",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new IntegrationCryptoError(
      "INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes",
    );
  }
  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptCredentials(payload: IntegrationCredentialPayload): {
  ciphertext: string;
  iv: string;
  keyVersion: number;
} {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptCredentials(input: {
  ciphertext: string;
  iv: string;
}): IntegrationCredentialPayload {
  const key = getKey();
  const data = Buffer.from(input.ciphertext, "base64");
  const iv = Buffer.from(input.iv, "base64");
  if (data.length < 17) {
    throw new IntegrationCryptoError("Invalid ciphertext");
  }
  const tag = data.subarray(data.length - 16);
  const encrypted = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as IntegrationCredentialPayload;
}

function stateSecret(): Buffer {
  const fromEnv = process.env.INTEGRATION_OAUTH_STATE_SECRET;
  if (fromEnv) return Buffer.from(fromEnv, "utf8");
  try {
    return getKey();
  } catch {
    throw new IntegrationCryptoError("OAuth state secret not configured");
  }
}

export function signOAuthState(payload: {
  workspaceId: string;
  providerSlug: string;
  userId: string;
  nonce: string;
  exp: number;
}): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(state: string): {
  workspaceId: string;
  providerSlug: string;
  userId: string;
  nonce: string;
  exp: number;
} {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new IntegrationCryptoError("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new IntegrationCryptoError("Invalid OAuth state signature");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    workspaceId: string;
    providerSlug: string;
    userId: string;
    nonce: string;
    exp: number;
  };
  if (payload.exp < Date.now()) {
    throw new IntegrationCryptoError("OAuth state expired");
  }
  return payload;
}
