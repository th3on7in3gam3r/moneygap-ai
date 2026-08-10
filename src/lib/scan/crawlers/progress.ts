import type { CrawlProgressStage, CrawlProgressUpdate, CrawlProviderName } from "./types";

export function crawlStageMessage(
  stage: CrawlProgressStage,
  opts: {
    provider?: CrawlProviderName;
    pagesDiscovered?: number;
    pagesCompleted?: number;
    reason?: string;
  } = {},
): string {
  const provider = opts.provider ?? "apify";
  switch (stage) {
    case "starting":
      return "Starting crawler…";
    case "discovering":
      return opts.pagesDiscovered
        ? `${opts.pagesDiscovered} pages discovered`
        : "Discovering pages…";
    case "running":
      if (provider === "apify") {
        if (opts.pagesCompleted != null && opts.pagesDiscovered != null) {
          return `Apify crawl running — ${opts.pagesCompleted} of ${opts.pagesDiscovered} pages processed`;
        }
        if (opts.pagesDiscovered != null && opts.pagesDiscovered > 0) {
          return `Apify crawl running — ${opts.pagesDiscovered} pages discovered`;
        }
        return "Apify crawl running…";
      }
      return "Crawl running…";
    case "retrieving":
      return "Retrieving crawl results…";
    case "normalizing":
      return "Normalizing page content…";
    case "recovering":
      return opts.reason
        ? `Recovering pages (${opts.reason})…`
        : "Recovering a few difficult pages…";
    case "complete":
      return "Crawl complete";
    case "fallback":
      return opts.reason
        ? `Switching crawl provider (${opts.reason})…`
        : "Switching crawl provider…";
    case "failed":
      return "Crawl failed";
    default:
      return "Crawling…";
  }
}

export function buildProgressUpdate(
  provider: CrawlProviderName,
  stage: CrawlProgressStage,
  partial: Partial<CrawlProgressUpdate> & { reason?: string } = {},
): CrawlProgressUpdate {
  const { reason, ...rest } = partial;
  return {
    provider,
    stage,
    message: crawlStageMessage(stage, {
      provider,
      pagesDiscovered: rest.pagesDiscovered,
      pagesCompleted: rest.pagesCompleted,
      reason,
    }),
    ...rest,
  };
}
