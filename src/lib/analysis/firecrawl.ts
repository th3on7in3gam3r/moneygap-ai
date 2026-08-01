import Firecrawl from "@mendable/firecrawl-js";
import type { PageType } from "@/lib/analysis/stages";
import { MISSING_KEYS_ERROR, PUBLIC_CRAWL_ERROR } from "@/lib/analysis/stages";
import { withRetry } from "@/lib/observability/logger";

export type ScrapedPage = {
  url: string;
  pageType: PageType;
  title: string | null;
  markdown: string;
  metadata: Record<string, unknown>;
};

const PAGE_TYPE_PATTERNS: { type: PageType; patterns: RegExp[] }[] = [
  { type: "about", patterns: [/\/about(?:-us)?(?:\/|$)/i, /\/company(?:\/|$)/i, /\/our-story(?:\/|$)/i] },
  { type: "services", patterns: [/\/services?(?:\/|$)/i, /\/solutions?(?:\/|$)/i, /\/what-we-do(?:\/|$)/i] },
  { type: "products", patterns: [/\/products?(?:\/|$)/i, /\/shop(?:\/|$)/i, /\/store(?:\/|$)/i, /\/catalog(?:\/|$)/i] },
  { type: "pricing", patterns: [/\/pricing(?:\/|$)/i, /\/plans?(?:\/|$)/i, /\/packages?(?:\/|$)/i] },
  { type: "blog", patterns: [/\/blog(?:\/|$)/i, /\/news(?:\/|$)/i, /\/articles?(?:\/|$)/i, /\/insights?(?:\/|$)/i] },
  { type: "contact", patterns: [/\/contact(?:-us)?(?:\/|$)/i, /\/get-in-touch(?:\/|$)/i, /\/support(?:\/|$)/i] },
  { type: "faq", patterns: [/\/faq(?:\/|$)/i, /\/help(?:\/|$)/i, /\/questions?(?:\/|$)/i] },
  {
    type: "resources",
    patterns: [/\/resources?(?:\/|$)/i, /\/guides?(?:\/|$)/i, /\/docs?(?:\/|$)/i, /\/learn(?:\/|$)/i, /\/library(?:\/|$)/i],
  },
];

function classifyPageType(url: string, homepageUrl: string): PageType {
  try {
    const parsed = new URL(url);
    const home = new URL(homepageUrl);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (parsed.origin === home.origin && (path === "/" || path === "")) {
      return "homepage";
    }
  } catch {
    // fall through
  }

  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return type;
  }
  return "other";
}

function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(MISSING_KEYS_ERROR);
  }
  return new Firecrawl({ apiKey });
}

function pickPriorityUrls(homepage: string, mapped: string[], limit = 12): string[] {
  const home = homepage.replace(/\/$/, "");
  const scored = mapped
    .map((url) => {
      const type = classifyPageType(url, homepage);
      const priority: Record<PageType, number> = {
        homepage: 0,
        about: 1,
        services: 2,
        products: 3,
        pricing: 4,
        blog: 5,
        contact: 6,
        faq: 7,
        resources: 8,
        nav: 9,
        other: 10,
      };
      return { url, type, score: priority[type] };
    })
    .filter((item) => item.type !== "other" || item.url.replace(/\/$/, "") === home)
    .sort((a, b) => a.score - b.score);

  const seenTypes = new Set<PageType>();
  const selected: string[] = [];

  for (const item of scored) {
    if (item.type === "other") continue;
    if (seenTypes.has(item.type) && item.type !== "blog") continue;
    seenTypes.add(item.type);
    selected.push(item.url);
    if (selected.length >= limit) break;
  }

  if (!selected.some((u) => classifyPageType(u, homepage) === "homepage")) {
    selected.unshift(homepage);
  }

  for (const url of mapped) {
    if (selected.length >= limit) break;
    if (!selected.includes(url)) selected.push(url);
  }

  return Array.from(new Set(selected)).slice(0, limit);
}

export async function crawlWebsite(url: string): Promise<ScrapedPage[]> {
  const client = getFirecrawl();

  let mappedUrls: string[] = [url];
  try {
    const mapResult = await client.map(url, { limit: 80 });
    const urls = (mapResult.links ?? [])
      .map((link) => link.url)
      .filter((u): u is string => Boolean(u));
    if (urls.length > 0) {
      mappedUrls = urls;
    }
  } catch {
    // Map is best-effort; continue with homepage scrape
  }

  const targets = pickPriorityUrls(url, mappedUrls, 12);
  const pages: ScrapedPage[] = [];

  for (const target of targets) {
    try {
      const result = await withRetry(
        () =>
          client.scrape(target, {
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        { attempts: 2, baseMs: 300, label: "firecrawl_scrape" },
      );

      const markdown = result.markdown ?? "";
      if (!markdown || markdown.trim().length < 40) continue;

      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const title =
        (typeof metadata.title === "string" && metadata.title) ||
        (typeof metadata.ogTitle === "string" && metadata.ogTitle) ||
        null;

      pages.push({
        url: target,
        pageType: classifyPageType(target, url),
        title,
        markdown: markdown.slice(0, 24000),
        metadata,
      });
    } catch {
      // Skip individual page failures
    }
  }

  if (pages.length === 0) {
    throw new Error(PUBLIC_CRAWL_ERROR);
  }

  if (!pages.some((p) => p.pageType === "homepage")) {
    pages[0] = { ...pages[0], pageType: "homepage" };
  }

  return pages;
}

export function buildCrawlCorpus(pages: ScrapedPage[]): string {
  return pages
    .map(
      (page) =>
        `## [${page.pageType.toUpperCase()}] ${page.title ?? page.url}\nURL: ${page.url}\n\n${page.markdown}`,
    )
    .join("\n\n---\n\n")
    .slice(0, 90000);
}
