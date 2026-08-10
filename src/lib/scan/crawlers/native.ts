import { CrawlProviderError } from "./errors";
import type { CrawlInput, CrawlProvider, CrawlResult } from "./types";

/**
 * Native MoneyGap crawler is durable (discover → queue → ticks/worker).
 * The CrawlProvider.crawl() contract cannot run that full lifecycle inline;
 * orchestration calls runIncrementalDiscover instead via acquisition.ts.
 *
 * This stub exists so the router can reference a native provider name and
 * throw a classified signal that acquisition interprets as "hand off to native".
 */
export const NATIVE_HANDOFF = "NATIVE_HANDOFF";

export const nativeCrawlProvider: CrawlProvider = {
  name: "native",

  async crawl(_input: CrawlInput): Promise<CrawlResult> {
    throw new CrawlProviderError(NATIVE_HANDOFF, {
      errorClass: "provider",
      provider: "native",
      retryable: false,
    });
  },
};

export function isNativeHandoff(err: unknown): boolean {
  return (
    err instanceof CrawlProviderError &&
    err.provider === "native" &&
    err.message === NATIVE_HANDOFF
  );
}
