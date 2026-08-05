import { z } from "zod";

export const CrawlModeSchema = z.enum(["quick", "standard", "deep"]);
export type CrawlMode = z.infer<typeof CrawlModeSchema>;

export const PageTypeSchema = z.enum([
  "homepage",
  "nav",
  "about",
  "services",
  "products",
  "pricing",
  "blog",
  "contact",
  "faq",
  "resources",
  "other",
]);
export type PageType = z.infer<typeof PageTypeSchema>;

export const QueueStateSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "retry",
  "failed",
  "cancelled",
]);
export type QueueState = z.infer<typeof QueueStateSchema>;

export const CrawlConfigSchema = z.object({
  url: z.string().url(),
  mode: CrawlModeSchema.default("standard"),
  maxPages: z.number().int().positive().max(50_000).default(25),
  maxDepth: z.number().int().min(0).max(20).default(4),
  maxRuntimeMs: z.number().int().positive().default(140_000),
  maxRedirects: z.number().int().min(0).max(20).default(8),
  maxRetries: z.number().int().min(0).max(8).default(3),
  maxResponseBytes: z.number().int().positive().default(2_000_000),
  concurrency: z.number().int().positive().max(50).default(10),
  crawlDelayMs: z.number().int().min(0).default(0),
  allowExternal: z.boolean().default(false),
  playwrightEnabled: z.boolean().default(false),
  discoverOnly: z.boolean().default(false),
  userAgent: z
    .string()
    .default("MoneyGapCrawler/0.1 (+https://moneygap-ai.com)"),
  cacheTtlMs: z.number().int().min(0).default(15 * 60_000),
  jobId: z.string().optional(),
});
export type CrawlConfig = z.infer<typeof CrawlConfigSchema>;
export type CrawlConfigInput = z.input<typeof CrawlConfigSchema>;

export type FrameworkId =
  | "nextjs"
  | "react"
  | "vue"
  | "nuxt"
  | "astro"
  | "angular"
  | "sveltekit"
  | "unknown";

export type DiscoveryResult = {
  homepage: string;
  urls: string[];
  sitemapFound: boolean;
  sitemapUrlCount: number;
  robotsFound: boolean;
  framework: FrameworkId;
  jsRequired: boolean;
  homepageLinkCount: number;
  warnings: string[];
  durationMs: number;
};

export type PageRecord = {
  url: string;
  finalUrl: string;
  pageType: PageType;
  title: string | null;
  description: string | null;
  headings: string[];
  canonical: string | null;
  openGraph: Record<string, string>;
  schemaTypes: string[];
  internalLinks: string[];
  externalLinks: string[];
  images: string[];
  structuredData: unknown[];
  framework: FrameworkId;
  language: string | null;
  statusCode: number;
  markdown: string;
  renderedWith: "cheerio" | "playwright";
  fetchMs: number;
  error?: string;
};

/** MoneyGap analysis contract — keep stable for pipeline / Engine. */
export type ScrapedPage = {
  url: string;
  pageType: PageType;
  title: string | null;
  markdown: string;
  metadata: Record<string, unknown>;
};

export type ProgressPhase =
  | "normalize"
  | "robots"
  | "sitemap"
  | "discover"
  | "queue"
  | "extract"
  | "complete"
  | "failed";

export type ProgressEvent = {
  phase: ProgressPhase;
  pagesDiscovered: number;
  pagesProcessed: number;
  pagesRemaining: number;
  pagesFailed: number;
  currentUrl: string | null;
  etaMs: number | null;
  memoryMb: number | null;
  errors: string[];
  warnings: string[];
  message: string;
};

export type CrawlResult = {
  pages: PageRecord[];
  scraped: ScrapedPage[];
  progress: ProgressEvent;
  durationMs: number;
  mode: CrawlMode;
  warnings: string[];
};

export type OnProgress = (event: ProgressEvent) => void | Promise<void>;
