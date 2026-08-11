import type { TickScheduleErrorClass } from "@/lib/scan/tick-errors";

/**
 * Origin used for crawl tick / complete self-scheduling.
 * Prefer explicit APP_URL so misconfigured localhost NEXT_PUBLIC does not
 * silently target the wrong host. Does NOT fall back to production default
 * (unlike getSiteOrigin) — missing config must be diagnosable.
 */
export function resolveCrawlTickOrigin(): {
  origin: string | null;
  source: "APP_URL" | "NEXT_PUBLIC_APP_URL" | null;
  missing: boolean;
} {
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "") || null;
  const publicUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || null;

  if (appUrl && !isLocalHost(appUrl)) {
    return { origin: appUrl, source: "APP_URL", missing: false };
  }
  if (publicUrl && !isLocalHost(publicUrl)) {
    return { origin: publicUrl, source: "NEXT_PUBLIC_APP_URL", missing: false };
  }
  // Allow localhost only in non-production for local tick testing
  if (process.env.VERCEL_ENV !== "production") {
    if (appUrl) return { origin: appUrl, source: "APP_URL", missing: false };
    if (publicUrl) {
      return { origin: publicUrl, source: "NEXT_PUBLIC_APP_URL", missing: false };
    }
  }
  return { origin: null, source: null, missing: true };
}

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return true;
  }
}

export function diagnoseTickEnv(): {
  ok: boolean;
  message: string | null;
  errorClass: TickScheduleErrorClass | null;
  hasSecret: boolean;
  hasOrigin: boolean;
  origin: string | null;
} {
  const secret = Boolean(process.env.CRON_SECRET?.trim());
  const { origin, missing } = resolveCrawlTickOrigin();
  if (!secret && missing) {
    return {
      ok: false,
      message:
        "Missing CRON_SECRET and APP_URL (or NEXT_PUBLIC_APP_URL) — crawl ticks cannot self-schedule over HTTP.",
      errorClass: "ENV_INCOMPLETE",
      hasSecret: false,
      hasOrigin: false,
      origin: null,
    };
  }
  if (!secret) {
    return {
      ok: false,
      message:
        "Missing CRON_SECRET — crawl ticks cannot authenticate to /api/scan/tick.",
      errorClass: "MISSING_CRON_SECRET",
      hasSecret: false,
      hasOrigin: Boolean(origin),
      origin,
    };
  }
  if (missing || !origin) {
    return {
      ok: false,
      message:
        "Missing APP_URL (or NEXT_PUBLIC_APP_URL) — crawl ticks cannot resolve the web origin.",
      errorClass: "MISSING_APP_URL",
      hasSecret: true,
      hasOrigin: false,
      origin: null,
    };
  }
  return {
    ok: true,
    message: null,
    errorClass: null,
    hasSecret: true,
    hasOrigin: true,
    origin,
  };
}
