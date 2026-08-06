export type FetchTextResult =
  | {
      ok: true;
      text: string;
      statusCode: number;
      finalUrl: string;
      headers: Record<string, string>;
      fetchMs: number;
    }
  | {
      ok: false;
      error: string;
      statusCode?: number;
      fetchMs: number;
    };

const DEFAULT_TIMEOUT_MS = 15_000;

export async function fetchBytes(
  url: string,
  opts: {
    timeoutMs: number;
    maxBytes: number;
    userAgent: string;
    maxRedirects: number;
  },
): Promise<
  | {
      ok: true;
      bytes: Uint8Array;
      statusCode: number;
      finalUrl: string;
      headers: Record<string, string>;
      fetchMs: number;
    }
  | { ok: false; error: string; statusCode?: number; fetchMs: number }
> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": opts.userAgent,
        Accept: "application/xml,text/xml,application/gzip,*/*;q=0.8",
        "Accept-Encoding": "identity",
      },
    });
    const buf = await res.arrayBuffer();
    if (controller.signal.aborted) {
      return {
        ok: false,
        error: "Request timed out",
        fetchMs: Date.now() - started,
      };
    }
    if (buf.byteLength > opts.maxBytes) {
      return {
        ok: false,
        error: `Response too large (${buf.byteLength} bytes)`,
        statusCode: res.status,
        fetchMs: Date.now() - started,
      };
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return {
      ok: true,
      bytes: new Uint8Array(buf),
      statusCode: res.status,
      finalUrl: res.url || url,
      headers,
      fetchMs: Date.now() - started,
    };
  } catch (err) {
    const aborted =
      (err instanceof Error && err.name === "AbortError") ||
      controller.signal.aborted;
    return {
      ok: false,
      error: aborted
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : String(err),
      fetchMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(
  url: string,
  opts: {
    timeoutMs: number;
    maxBytes: number;
    userAgent: string;
    maxRedirects: number;
  },
): Promise<FetchTextResult> {
  const binary = await fetchBytes(url, opts);
  if (!binary.ok) {
    return {
      ok: false,
      error: binary.error,
      statusCode: binary.statusCode,
      fetchMs: binary.fetchMs,
    };
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(binary.bytes);
  return {
    ok: true,
    text,
    statusCode: binary.statusCode,
    finalUrl: binary.finalUrl,
    headers: binary.headers,
    fetchMs: binary.fetchMs,
  };
}
