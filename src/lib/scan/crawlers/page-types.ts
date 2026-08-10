import type { PageType } from "@/lib/analysis/stages";

/** Same shape as moneygap-crawler ScrapedPage / app firecrawl ScrapedPage. */
export type ScrapedPage = {
  url: string;
  pageType: PageType;
  title: string | null;
  markdown: string;
  metadata: Record<string, unknown>;
};
