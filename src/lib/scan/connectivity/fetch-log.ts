import { log } from "@/lib/observability/logger";
import { classifyNetworkError } from "./classify-error";
import type { ConnectivityFetchRecord } from "./types";

export type LoggedFetchResult =
  | {
      ok: true;
      response: Response;
      bodyText: string;
      record: ConnectivityFetchRecord;
    }
  | {
      ok: false;
      record: ConnectivityFetchRecord;
      classified: ReturnType<typeof classifyNetworkError>;
    };

const DEFAULT_UA = "MoneyGapAI-Connectivity/1.0 (+https://moneygap-ai.com)";
/**
 * Prefer Accept wildcard (* / *). Clerk development handshake treats text/html
 * Accept as a browser and 307s to accounts.dev even for public marketing pages.
 */
export const CONNECTIVITY_ACCEPT = "*/*";
/** Bot retry headers after a Clerk development handshake. */
export const CONNECTIVITY_BOT_HEADERS = {
  "User-Agent": DEFAULT_UA,
  Accept: CONNECTIVITY_ACCEPT,
} as const;
const MAX_BODY_CHARS = 256_000;

export type LoggedFetchOptions = {
  method?: "GET";
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Manual redirect following — never use fetch redirect:"follow" here. */
  redirect?: "manual";
  maxBodyChars?: number;
  fetchLog: ConnectivityFetchRecord[];
};

/**
 * Single-attempt instrumented GET. No retries.
 */
export async function loggedFetch(
  url: string,
  opts: LoggedFetchOptions,
): Promise<LoggedFetchResult> {
  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      redirect: opts.redirect ?? "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: CONNECTIVITY_ACCEPT,
        "User-Agent": DEFAULT_UA,
        ...(opts.headers ?? {}),
      },
    });

    const maxChars = opts.maxBodyChars ?? MAX_BODY_CHARS;
    let bodyText = "";
    try {
      const buf = await response.arrayBuffer();
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      bodyText = decoded.slice(0, maxChars);
    } catch {
      bodyText = "";
    }

    const record: ConnectivityFetchRecord = {
      url,
      method,
      status: response.status,
      redirectCount: 0,
      elapsedMs: Date.now() - started,
    };
    opts.fetchLog.push(record);
    log("info", "connectivity_fetch", {
      url,
      method,
      status: response.status,
      redirectCount: 0,
      elapsedMs: record.elapsedMs,
    });
    return { ok: true, response, bodyText, record };
  } catch (err) {
    const classified = classifyNetworkError(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const record: ConnectivityFetchRecord = {
      url,
      method,
      status: null,
      redirectCount: 0,
      elapsedMs: Date.now() - started,
      timeoutReason: classified.timeoutReason,
      error: classified.message,
      stack,
    };
    opts.fetchLog.push(record);
    log("warn", "connectivity_fetch", {
      url,
      method,
      status: null,
      redirectCount: 0,
      elapsedMs: record.elapsedMs,
      timeoutReason: classified.timeoutReason ?? null,
      error: classified.message,
      code: classified.code,
      kind: classified.kind,
      stack: stack ?? null,
    });
    return { ok: false, record, classified };
  } finally {
    clearTimeout(timer);
  }
}
