import { eq } from "drizzle-orm";
import { db } from "@/db";
import { selfOptimizationSettings } from "@/db/schema";
import { validateAndNormalizeUrl } from "@/lib/analysis/url";
import { isSelfOptimizationEnabled } from "./flag";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

/**
 * Self Optimization may target the running app (incl. localhost in development).
 * Public analyze flows still reject private hosts via validateAndNormalizeUrl.
 */
export function validateSelfOptimizationUrl(input: string): {
  ok: true;
  value: { href: string; origin: string; hostname: string; domain: string };
} | {
  ok: false;
  error: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a self-scan URL." };
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }

  const hostname = parsed.hostname.replace(/\.$/, "").toLowerCase();
  const isLocal = LOCAL_HOSTS.has(hostname);

  // Public sites: prefer https. Local/dev: keep http so APP_URL works.
  if (!isLocal && parsed.protocol === "http:") {
    parsed.protocol = "https:";
  }

  if (!hostname) {
    return { ok: false, error: "Enter a valid hostname." };
  }

  if (!isLocal && !hostname.includes(".")) {
    return { ok: false, error: "Enter a public domain or localhost for local scans." };
  }

  const allowLocal =
    process.env.NODE_ENV !== "production" ||
    process.env.SELF_OPTIMIZATION_ALLOW_LOCAL === "1" ||
    process.env.SELF_OPTIMIZATION_ALLOW_LOCAL === "true";

  if (isLocal && !allowLocal) {
    return {
      ok: false,
      error:
        "Local self-scan URLs are disabled in production. Set SELF_OPTIMIZATION_URL to your public site.",
    };
  }

  // Prefer 127.0.0.1 for local self-scans (avoids proxy/DNS quirks with "localhost")
  if (isLocal && hostname === "localhost") {
    parsed.hostname = "127.0.0.1";
  }

  parsed.hash = "";
  const origin = parsed.origin;
  const href =
    parsed.pathname === "/" || !parsed.pathname
      ? origin
      : `${origin}${parsed.pathname}`.replace(/\/$/, "");

  const displayHost = isLocal ? "localhost" : hostname.replace(/^www\./, "");

  return {
    ok: true,
    value: {
      href,
      origin,
      hostname: parsed.hostname,
      domain: displayHost,
    },
  };
}

export function resolveDefaultSelfUrl(): string {
  const candidates = [
    process.env.SELF_OPTIMIZATION_URL,
    process.env.APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://moneygap.ai",
  ];
  for (const c of candidates) {
    if (!c?.trim()) continue;
    const v = validateSelfOptimizationUrl(c.trim());
    if (v.ok) return v.value.origin;
  }
  // Last resort: public analyzer still used for marketing domain when set
  const publicFallback = validateAndNormalizeUrl("https://moneygap.ai");
  if (publicFallback.ok) return publicFallback.value.origin;
  return "https://moneygap.ai";
}

async function getSettings(workspaceId: string) {
  const rows = await db
    .select()
    .from(selfOptimizationSettings)
    .where(eq(selfOptimizationSettings.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}

export async function resolveSelfScanTarget(workspaceId: string): Promise<{
  enabled: boolean;
  url: string;
  source: "workspace" | "env" | "default";
  message: string | null;
}> {
  if (!isSelfOptimizationEnabled()) {
    return {
      enabled: false,
      url: resolveDefaultSelfUrl(),
      source: "default",
      message: "Self Optimization™ is disabled (FEATURE_SELF_OPTIMIZATION).",
    };
  }

  const settings = await getSettings(workspaceId);

  if (settings && settings.enabled === false) {
    return {
      enabled: false,
      url: settings.targetUrl || resolveDefaultSelfUrl(),
      source: "workspace",
      message: "Self Optimization™ is turned off for this workspace.",
    };
  }

  if (settings?.targetUrl?.trim()) {
    const v = validateSelfOptimizationUrl(settings.targetUrl.trim());
    if (v.ok) {
      return {
        enabled: true,
        url: v.value.origin,
        source: "workspace",
        message: null,
      };
    }
  }

  const fromEnv = process.env.SELF_OPTIMIZATION_URL?.trim();
  if (fromEnv) {
    const v = validateSelfOptimizationUrl(fromEnv);
    if (v.ok) {
      return {
        enabled: true,
        url: v.value.origin,
        source: "env",
        message: null,
      };
    }
  }

  const fromApp = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) {
    const v = validateSelfOptimizationUrl(fromApp);
    if (v.ok) {
      return {
        enabled: true,
        url: v.value.origin,
        source: "env",
        message: null,
      };
    }
  }

  return {
    enabled: true,
    url: resolveDefaultSelfUrl(),
    source: "default",
    message: null,
  };
}

export async function upsertSelfOptSettings(
  workspaceId: string,
  input: { targetUrl?: string | null; enabled?: boolean },
) {
  const existing = await getSettings(workspaceId);

  if (existing) {
    const [row] = await db
      .update(selfOptimizationSettings)
      .set({
        targetUrl:
          input.targetUrl !== undefined ? input.targetUrl : existing.targetUrl,
        enabled: input.enabled ?? existing.enabled,
        updatedAt: new Date(),
      })
      .where(eq(selfOptimizationSettings.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(selfOptimizationSettings)
    .values({
      workspaceId,
      targetUrl: input.targetUrl ?? null,
      enabled: input.enabled ?? true,
    })
    .returning();
  return row;
}
