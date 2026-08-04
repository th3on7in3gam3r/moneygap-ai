import type { DiagnosticFinding } from "./types.js";

const DEFAULT_UA =
  "MoneyGapDiagnostics/0.1 (+https://moneygap-ai.com; sandbox+cli)";

export type FetchedPage = {
  finalUrl: string;
  statusCode: number;
  html: string;
  bytes: number;
  contentType: string | null;
};

export async function fetchText(
  url: string,
  opts: { timeoutMs: number; maxBytes: number; userAgent?: string },
): Promise<{ ok: true; text: string; statusCode: number; finalUrl: string } | {
  ok: false;
  error: string;
  statusCode?: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": opts.userAgent ?? DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > opts.maxBytes) {
      return {
        ok: false,
        error: `Response too large (over ${Math.round(opts.maxBytes / 1024)}KB).`,
        statusCode: res.status,
      };
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return {
      ok: true,
      text,
      statusCode: res.status,
      finalUrl: res.url || url,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "Request timed out." : "Could not fetch this URL.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(
  url: string,
  opts: { timeoutMs: number; maxHtmlBytes: number; userAgent?: string },
): Promise<
  | { ok: true; page: FetchedPage }
  | { ok: false; error: string; findings: DiagnosticFinding[] }
> {
  const result = await fetchText(url, {
    timeoutMs: opts.timeoutMs,
    maxBytes: opts.maxHtmlBytes,
    userAgent: opts.userAgent,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      findings: [
        {
          id: "fetch.unreachable",
          category: "fetch",
          severity: "fail",
          title: "Page could not be fetched",
          detail: result.error,
        },
      ],
    };
  }

  if (result.statusCode >= 400) {
    return {
      ok: false,
      error: `HTTP ${result.statusCode}`,
      findings: [
        {
          id: "fetch.http_error",
          category: "fetch",
          severity: "fail",
          title: `HTTP ${result.statusCode} response`,
          detail: `The site returned status ${result.statusCode}. Public pages should respond with 2xx or 3xx.`,
        },
      ],
    };
  }

  return {
    ok: true,
    page: {
      finalUrl: result.finalUrl,
      statusCode: result.statusCode,
      html: result.text,
      bytes: Buffer.byteLength(result.text, "utf8"),
      contentType: null,
    },
  };
}
