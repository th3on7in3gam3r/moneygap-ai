import {
  isApifyCircuitOpen,
  recordApifyProviderFailure,
  recordApifySuccess,
} from "./circuit";
import {
  assertPublicCrawlUrl,
  classifyCrawlError,
  CrawlProviderError,
  isFallbackEligible,
  isNonFallbackError,
} from "./errors";
import { isApifyConfigured } from "./apify";
import { firecrawlCrawlProvider, isFirecrawlConfigured } from "./firecrawl";
import { isNativeHandoff, nativeCrawlProvider } from "./native";
import { buildProgressUpdate } from "./progress";
import type {
  CrawlInput,
  CrawlProviderName,
  CrawlResult,
  PreferredCrawlProvider,
} from "./types";

export function getPreferredCrawlProvider(): PreferredCrawlProvider {
  const raw = process.env.CRAWL_PROVIDER?.trim().toLowerCase();
  if (raw === "apify" || raw === "firecrawl" || raw === "native" || raw === "scrapedo") {
    return raw;
  }
  return "auto";
}

export function resolveProviderOrder(
  preferred: PreferredCrawlProvider = getPreferredCrawlProvider(),
): CrawlProviderName[] {
  if (preferred === "native") return ["native"];
  if (preferred === "firecrawl") return ["firecrawl", "native"];
  if (preferred === "scrapedo") return ["firecrawl", "native"];
  if (preferred === "apify") return ["apify", "firecrawl", "native"];

  // auto: Apify primary when configured and circuit closed
  const order: CrawlProviderName[] = [];
  if (isApifyConfigured() && !isApifyCircuitOpen()) {
    order.push("apify");
  } else if (isApifyConfigured() && isApifyCircuitOpen()) {
    console.info("[CRAWL_PROVIDER]", {
      event: "circuit_open",
      provider: "apify",
      action: "skip_to_fallback",
    });
  } else if (!isApifyConfigured()) {
    console.warn("Apify unavailable: APIFY_API_TOKEN not configured");
  }

  order.push("firecrawl", "native");
  return order;
}

export type RouterStartResult =
  | {
      kind: "apify_started";
      runId: string;
      datasetId?: string | null;
      status: string;
    }
  | {
      kind: "sync_pages";
      result: CrawlResult;
    }
  | {
      kind: "native_handoff";
      reason: string;
      fallbackUsed: boolean;
      fallbackFrom?: CrawlProviderName;
    }
  | {
      kind: "failed";
      error: CrawlProviderError;
    };

/**
 * Start acquisition. Apify is async (caller polls). Firecrawl is sync pages.
 * Native is a handoff signal for runIncrementalDiscover.
 */
export async function routeCrawlStart(
  input: CrawlInput,
  opts: {
    startApify: (input: CrawlInput) => Promise<{
      id: string;
      status: string;
      defaultDatasetId?: string | null;
    }>;
  },
): Promise<RouterStartResult> {
  try {
    assertPublicCrawlUrl(input.url);
  } catch (err) {
    const error =
      err instanceof CrawlProviderError
        ? err
        : new CrawlProviderError("Invalid URL", {
            errorClass: "invalid_url",
            provider: "router",
            retryable: false,
          });
    return { kind: "failed", error };
  }

  const order = resolveProviderOrder();
  let fallbackUsed = false;
  let fallbackFrom: CrawlProviderName | undefined;

  for (const name of order) {
    console.info("[CRAWL_PROVIDER]", {
      scanId: input.scanId,
      provider: name,
      event: "start",
    });

    try {
      if (name === "apify") {
        await input.onProgress?.(buildProgressUpdate("apify", "starting"));
        const run = await opts.startApify(input);
        return {
          kind: "apify_started",
          runId: run.id,
          datasetId: run.defaultDatasetId,
          status: run.status,
        };
      }

      if (name === "firecrawl") {
        if (!isFirecrawlConfigured()) {
          throw new CrawlProviderError(
            "Firecrawl unavailable: FIRECRAWL_API_KEY not configured",
            { errorClass: "provider", provider: "firecrawl", retryable: true },
          );
        }
        if (fallbackFrom) {
          fallbackUsed = true;
          await input.onProgress?.(
            buildProgressUpdate("firecrawl", "fallback", {
              reason: `after ${fallbackFrom}`,
            }),
          );
        }
        const result = await firecrawlCrawlProvider.crawl(input);
        if (fallbackUsed) {
          result.diagnostics = {
            ...result.diagnostics,
            provider: "firecrawl",
            fallbackUsed: true,
            fallbackProvider: "firecrawl",
          };
        }
        console.info("[CRAWL_PROVIDER]", {
          scanId: input.scanId,
          provider: "firecrawl",
          durationMs: result.durationMs,
          pages: result.pages.length,
        });
        return { kind: "sync_pages", result };
      }

      // native
      if (fallbackFrom) {
        fallbackUsed = true;
        await input.onProgress?.(
          buildProgressUpdate("native", "fallback", {
            reason: `after ${fallbackFrom}`,
          }),
        );
      }
      return {
        kind: "native_handoff",
        reason: fallbackFrom
          ? `fallback_after_${fallbackFrom}`
          : "preferred_or_only",
        fallbackUsed,
        fallbackFrom,
      };
    } catch (err) {
      if (isNativeHandoff(err)) {
        return {
          kind: "native_handoff",
          reason: "native_provider",
          fallbackUsed,
          fallbackFrom,
        };
      }

      const errorClass = classifyCrawlError(err, name);
      console.info("[CRAWL_PROVIDER]", {
        scanId: input.scanId,
        provider: name,
        event: "fallback",
        reason: errorClass,
        message: err instanceof Error ? err.message : String(err),
      });

      if (name === "apify") {
        recordApifyProviderFailure();
      }

      if (isNonFallbackError(errorClass)) {
        return {
          kind: "failed",
          error:
            err instanceof CrawlProviderError
              ? err
              : new CrawlProviderError(
                  err instanceof Error ? err.message : String(err),
                  {
                    errorClass,
                    provider: name,
                    retryable: false,
                  },
                ),
        };
      }

      if (!isFallbackEligible(errorClass) && name === "native") {
        break;
      }

      fallbackFrom = name;
      fallbackUsed = true;
      continue;
    }
  }

  return {
    kind: "failed",
    error: new CrawlProviderError("All crawl providers failed", {
      errorClass: "provider",
      provider: "router",
      retryable: false,
    }),
  };
}

export function markApifyCrawlSucceeded(): void {
  recordApifySuccess();
}

export { nativeCrawlProvider };
