import { z } from 'zod';

declare const CrawlModeSchema: z.ZodEnum<["quick", "standard", "deep"]>;
type CrawlMode = z.infer<typeof CrawlModeSchema>;
declare const PageTypeSchema: z.ZodEnum<["homepage", "nav", "about", "services", "products", "pricing", "blog", "contact", "faq", "resources", "other"]>;
type PageType = z.infer<typeof PageTypeSchema>;
declare const QueueStateSchema: z.ZodEnum<["queued", "processing", "completed", "retry", "failed", "cancelled"]>;
type QueueState = z.infer<typeof QueueStateSchema>;
declare const CrawlConfigSchema: z.ZodObject<{
    url: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["quick", "standard", "deep"]>>;
    maxPages: z.ZodDefault<z.ZodNumber>;
    maxDepth: z.ZodDefault<z.ZodNumber>;
    maxRuntimeMs: z.ZodDefault<z.ZodNumber>;
    maxRedirects: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    maxResponseBytes: z.ZodDefault<z.ZodNumber>;
    concurrency: z.ZodDefault<z.ZodNumber>;
    crawlDelayMs: z.ZodDefault<z.ZodNumber>;
    allowExternal: z.ZodDefault<z.ZodBoolean>;
    playwrightEnabled: z.ZodDefault<z.ZodBoolean>;
    discoverOnly: z.ZodDefault<z.ZodBoolean>;
    userAgent: z.ZodDefault<z.ZodString>;
    cacheTtlMs: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    mode: "quick" | "standard" | "deep";
    maxPages: number;
    maxDepth: number;
    maxRuntimeMs: number;
    maxRedirects: number;
    maxRetries: number;
    maxResponseBytes: number;
    concurrency: number;
    crawlDelayMs: number;
    allowExternal: boolean;
    playwrightEnabled: boolean;
    discoverOnly: boolean;
    userAgent: string;
    cacheTtlMs: number;
    jobId?: string | undefined;
}, {
    url: string;
    mode?: "quick" | "standard" | "deep" | undefined;
    maxPages?: number | undefined;
    maxDepth?: number | undefined;
    maxRuntimeMs?: number | undefined;
    maxRedirects?: number | undefined;
    maxRetries?: number | undefined;
    maxResponseBytes?: number | undefined;
    concurrency?: number | undefined;
    crawlDelayMs?: number | undefined;
    allowExternal?: boolean | undefined;
    playwrightEnabled?: boolean | undefined;
    discoverOnly?: boolean | undefined;
    userAgent?: string | undefined;
    cacheTtlMs?: number | undefined;
    jobId?: string | undefined;
}>;
type CrawlConfig = z.infer<typeof CrawlConfigSchema>;
type CrawlConfigInput = z.input<typeof CrawlConfigSchema>;
type FrameworkId = "nextjs" | "react" | "vue" | "nuxt" | "astro" | "angular" | "sveltekit" | "unknown";
type DiscoveryResult = {
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
type PageRecord = {
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
type ScrapedPage = {
    url: string;
    pageType: PageType;
    title: string | null;
    markdown: string;
    metadata: Record<string, unknown>;
};
type ProgressPhase = "normalize" | "robots" | "sitemap" | "discover" | "queue" | "extract" | "complete" | "failed";
type ProgressEvent = {
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
type CrawlResult = {
    pages: PageRecord[];
    scraped: ScrapedPage[];
    progress: ProgressEvent;
    durationMs: number;
    mode: CrawlMode;
    warnings: string[];
};
type OnProgress = (event: ProgressEvent) => void | Promise<void>;

declare function crawlSite(input: CrawlConfigInput, opts?: {
    onProgress?: OnProgress;
    signal?: AbortSignal;
}): Promise<CrawlResult>;
/** Single-page extract for diagnostics / sandbox / CLI scan-url. */
declare function loadPageHtml(url: string, opts?: {
    playwrightEnabled?: boolean;
    userAgent?: string;
    timeoutMs?: number;
    maxBytes?: number;
}): Promise<{
    html: string;
    finalUrl: string;
    statusCode: number;
    fetchMs: number;
    renderedWith: "cheerio" | "playwright";
    framework: FrameworkId;
} | null>;
declare function extractSinglePage(url: string, opts?: {
    playwrightEnabled?: boolean;
    userAgent?: string;
    timeoutMs?: number;
    maxBytes?: number;
}): Promise<PageRecord | null>;

/**
 * Discovery-only: robots + sitemaps + nav harvest + prioritize.
 * Does not extract page content.
 */
declare function discoverOnly(input: CrawlConfigInput): Promise<DiscoveryResult>;

declare function toScrapedPage(page: PageRecord): ScrapedPage;
declare function toScrapedPages(pages: PageRecord[]): ScrapedPage[];

type FrameworkDetection = {
    framework: FrameworkId;
    needsJs: boolean;
    signals: string[];
};
declare function detectFramework(html: string): FrameworkDetection;

declare class MemoryCache {
    private store;
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown, ttlMs: number): void;
    clear(): void;
}

declare function parseSitemapXml(xml: string, baseUrl: string): {
    urls: string[];
    childSitemaps: string[];
};
declare function discoverSitemapUrls(origin: string, opts: {
    userAgent: string;
    timeoutMs: number;
    cache: MemoryCache;
    cacheTtlMs: number;
    extraSitemapUrls?: string[];
    maxSitemaps?: number;
    maxUrls?: number;
}): Promise<string[]>;

type RobotsGate = {
    isAllowed: (url: string) => boolean;
    crawlDelayMs: number;
    sitemaps: string[];
    raw: string | null;
};
declare function loadRobots(origin: string, opts: {
    userAgent: string;
    timeoutMs: number;
    cache: MemoryCache;
    cacheTtlMs: number;
}): Promise<RobotsGate>;

declare function classifyPageType(url: string, homepageUrl: string): PageType;
declare function prioritizeUrls(homepage: string, candidates: string[], limit: number, mode: "quick" | "standard" | "deep"): string[];

/**
 * Canonical crawl URL for dedup.
 * Collapses: trailing slash, hash, utm/fbclid/gclid, http→https.
 * example.com / example.com/ / ?utm= / #section → one URL.
 */
declare function normalizeCrawlUrl(raw: string, opts?: {
    stripHash?: boolean;
    stripWww?: boolean;
}): string;
declare function sameOrigin(a: string, b: string): boolean;
declare function resolveUrl(base: string, href: string): string | null;

type QueueItem = {
    url: string;
    depth: number;
    state: QueueState;
    attempts: number;
    lastError?: string;
};
declare class InMemoryCrawlQueue {
    private items;
    private order;
    enqueue(url: string, depth: number): boolean;
    has(url: string): boolean;
    size(): number;
    countByState(state: QueueState): number;
    nextQueued(): QueueItem | null;
    mark(url: string, state: QueueState, lastError?: string): void;
    snapshot(): QueueItem[];
}
declare function backoffMs(attempt: number, baseMs?: number): number;
declare function isTransientError(statusCode?: number, message?: string): boolean;

/** Lazy Playwright cleanup — avoid static export of the playwright renderer. */
declare function closeBrowser(): Promise<void>;

export { type CrawlConfig, type CrawlConfigInput, CrawlConfigSchema, type CrawlMode, CrawlModeSchema, type CrawlResult, type DiscoveryResult, type FrameworkId, InMemoryCrawlQueue, type OnProgress, type PageRecord, type PageType, PageTypeSchema, type ProgressEvent, type ProgressPhase, type QueueState, QueueStateSchema, type ScrapedPage, backoffMs, classifyPageType, closeBrowser, crawlSite, detectFramework, discoverOnly, discoverSitemapUrls, extractSinglePage, isTransientError, loadPageHtml, loadRobots, normalizeCrawlUrl, parseSitemapXml, prioritizeUrls, resolveUrl, sameOrigin, toScrapedPage, toScrapedPages };
