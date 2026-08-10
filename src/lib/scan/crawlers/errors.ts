export type CrawlErrorClass =
  | "invalid_url"
  | "private_url"
  | "unsupported_protocol"
  | "dns"
  | "timeout"
  | "anti_bot"
  | "rate_limit"
  | "provider"
  | "browser"
  | "empty"
  | "unknown";

export class CrawlProviderError extends Error {
  readonly errorClass: CrawlErrorClass;
  readonly provider: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    opts: {
      errorClass: CrawlErrorClass;
      provider: string;
      retryable?: boolean;
      cause?: unknown;
    },
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "CrawlProviderError";
    this.errorClass = opts.errorClass;
    this.provider = opts.provider;
    this.retryable = opts.retryable ?? isFallbackEligible(opts.errorClass);
  }
}

/** Errors that must NOT trigger expensive multi-provider retries. */
export function isNonFallbackError(errorClass: CrawlErrorClass): boolean {
  return (
    errorClass === "invalid_url" ||
    errorClass === "private_url" ||
    errorClass === "unsupported_protocol" ||
    errorClass === "dns"
  );
}

export function isFallbackEligible(errorClass: CrawlErrorClass): boolean {
  return !isNonFallbackError(errorClass);
}

export function classifyCrawlError(err: unknown, provider = "unknown"): CrawlErrorClass {
  if (err instanceof CrawlProviderError) return err.errorClass;

  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  const blob = msg;

  if (
    /invalid url|malformed url|not a valid url|url must|parse.*url/.test(blob)
  ) {
    return "invalid_url";
  }
  if (
    /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|private|rfc1918|link-local|metadata\.google/.test(
      blob,
    )
  ) {
    return "private_url";
  }
  if (/unsupported protocol|protocol must|ftp:|file:|javascript:/.test(blob)) {
    return "unsupported_protocol";
  }
  if (/enotfound|eai_again|nxdomain|dns|getaddrinfo/.test(blob)) {
    return "dns";
  }
  if (/timed?-?\s*out|etimedout|timeout|aborted/.test(blob)) {
    return "timeout";
  }
  if (/403|captcha|cloudflare|blocked|anti-?bot|forbidden/.test(blob)) {
    return "anti_bot";
  }
  if (/429|rate.?limit|too many requests|quota/.test(blob)) {
    return "rate_limit";
  }
  if (/browser|playwright|chromium|navigation failed/.test(blob)) {
    return "browser";
  }
  if (/empty dataset|no pages|zero pages/.test(blob)) {
    return "empty";
  }
  if (/apify|firecrawl|provider|5\d\d|service unavailable|internal server/.test(blob)) {
    return "provider";
  }

  void provider;
  return "unknown";
}

/**
 * Reject clearly invalid / non-public targets before spending provider credits.
 */
export function assertPublicCrawlUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new CrawlProviderError("Invalid URL", {
      errorClass: "invalid_url",
      provider: "router",
      retryable: false,
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CrawlProviderError(`Unsupported protocol: ${parsed.protocol}`, {
      errorClass: "unsupported_protocol",
      provider: "router",
      retryable: false,
    });
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === "169.254.169.254" ||
    /^fc[0-9a-f]{2}:/i.test(host) ||
    /^fd[0-9a-f]{2}:/i.test(host) ||
    /^fe80:/i.test(host)
  ) {
    throw new CrawlProviderError("Private or local URLs are not crawlable", {
      errorClass: "private_url",
      provider: "router",
      retryable: false,
    });
  }
}
