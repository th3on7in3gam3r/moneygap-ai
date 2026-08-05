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

function classifyFetchError(err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") {
    return "Request timed out. The site may be slow or blocking automated requests — try again, or use a faster public page.";
  }

  const chain: unknown[] = [err];
  let cur: unknown = err;
  for (let i = 0; i < 5; i++) {
    if (!cur || typeof cur !== "object" || !("cause" in cur)) break;
    const next = (cur as { cause?: unknown }).cause;
    if (!next) break;
    chain.push(next);
    cur = next;
  }

  const blob = chain
    .map((e) => {
      if (!e || typeof e !== "object") return String(e ?? "");
      const o = e as { code?: string; name?: string; message?: string };
      return `${o.code ?? ""} ${o.name ?? ""} ${o.message ?? ""}`;
    })
    .join(" ")
    .toUpperCase();

  if (/ENOTFOUND|EAI_AGAIN|ESERVFAIL|GETADDRINFO|DNS/.test(blob)) {
    return "We couldn’t resolve DNS for that domain. Check the spelling and confirm the domain is registered and publicly resolvable.";
  }
  if (/CERT_|UNABLE_TO_VERIFY|ERR_TLS|CERTIFICATE/.test(blob)) {
    return "TLS/certificate check failed for that URL. The site’s HTTPS may be misconfigured.";
  }
  if (/ECONNREFUSED/.test(blob)) {
    return "Connection refused. The host is not accepting HTTPS connections.";
  }
  if (/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|TIMEOUT/.test(blob)) {
    return "Connection timed out. The site may be down or blocking this network.";
  }
  if (/ECONNRESET|EPIPE/.test(blob)) {
    return "The connection was reset while fetching the page.";
  }

  return "Could not fetch this URL. Confirm it’s a public https site that loads in a private browser window.";
}

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
    return {
      ok: false,
      error: classifyFetchError(err),
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
