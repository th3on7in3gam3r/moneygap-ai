import type { ScrapedPage } from "./page-types";
import type { CrawlProviderName } from "./types";
import { isUsefulPage, pickBestPage, scorePageQuality } from "./quality";
import { classifyCrawlPageType } from "./classify-page";
import { normalizeCrawlUrl } from "./url-normalize";

export type FailedUrlRecord = {
  url: string;
  reason: string;
  statusCode?: number;
  important: boolean;
};

const HIGH_PRIORITY_RE =
  /\/(pricing|plans?|services?|products?|solutions?|features?|about(?:-us)?|contact(?:-us)?|case-stud(?:y|ies)|customers?|testimonials?|reviews?|industries|locations?|book|demo|quote|consultation)(?:\/|$)/i;

const MEDIUM_PRIORITY_RE =
  /\/(blog|resources?|guides?|news|faq|help)(?:\/|$)/i;

const LOW_PRIORITY_RE =
  /\/(privacy|terms|cookies?|legal|login|signin|sign-in|register|signup|author|tag|page\/\d+)(?:\/|$)/i;

export function normalizePageUrl(raw: string): string {
  try {
    return normalizeCrawlUrl(raw);
  } catch {
    return raw;
  }
}

export function isImportantUrl(url: string, homepageUrl: string): boolean {
  try {
    const u = new URL(url);
    const home = new URL(homepageUrl);
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (u.origin === home.origin && (path === "/" || path === "")) return true;
  } catch {
    /* ignore */
  }
  if (LOW_PRIORITY_RE.test(url) && !HIGH_PRIORITY_RE.test(url)) return false;
  return HIGH_PRIORITY_RE.test(url) || MEDIUM_PRIORITY_RE.test(url);
}

export function importanceRank(url: string, homepageUrl: string): number {
  try {
    const u = new URL(url);
    const home = new URL(homepageUrl);
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (u.origin === home.origin && (path === "/" || path === "")) return 0;
  } catch {
    /* ignore */
  }
  if (HIGH_PRIORITY_RE.test(url)) return 1;
  if (MEDIUM_PRIORITY_RE.test(url)) return 2;
  if (LOW_PRIORITY_RE.test(url)) return 4;
  return 3;
}

/**
 * In-memory corpus across providers. Never discard a better page for a worse one.
 */
export class SuccessfulPageMap {
  private readonly pages = new Map<string, ScrapedPage>();
  private readonly failed = new Map<string, FailedUrlRecord>();
  readonly homepageUrl: string;

  constructor(homepageUrl: string) {
    this.homepageUrl = homepageUrl;
  }

  get size(): number {
    return this.pages.size;
  }

  get failedCount(): number {
    return this.failed.size;
  }

  mergePage(page: ScrapedPage, provider: CrawlProviderName | string): void {
    const key = normalizePageUrl(page.url);
    const enriched: ScrapedPage = {
      ...page,
      url: key,
      pageType: page.pageType || classifyCrawlPageType(page.url, this.homepageUrl),
      metadata: {
        ...page.metadata,
        sourceProvider: provider,
        source: page.metadata?.source ?? provider,
      },
    };

    if (!isUsefulPage(enriched)) {
      this.markFailed(page.url, "empty_or_challenge", {
        statusCode:
          typeof enriched.metadata?.statusCode === "number"
            ? (enriched.metadata.statusCode as number)
            : undefined,
      });
      return;
    }

    const existing = this.pages.get(key);
    if (!existing) {
      this.pages.set(key, enriched);
    } else {
      this.pages.set(key, pickBestPage(existing, enriched));
    }
    this.failed.delete(key);
  }

  mergePages(pages: ScrapedPage[], provider: CrawlProviderName | string): number {
    let added = 0;
    const before = this.pages.size;
    for (const page of pages) {
      this.mergePage(page, provider);
    }
    added = Math.max(0, this.pages.size - before);
    return added;
  }

  markFailed(
    url: string,
    reason: string,
    opts: { statusCode?: number } = {},
  ): void {
    const key = normalizePageUrl(url);
    if (this.pages.has(key)) return;
    this.failed.set(key, {
      url: key,
      reason,
      statusCode: opts.statusCode,
      important: isImportantUrl(key, this.homepageUrl),
    });
  }

  failedUrls(opts: { importantOnly?: boolean; limit?: number } = {}): string[] {
    let rows = [...this.failed.values()];
    if (opts.importantOnly) {
      rows = rows.filter((r) => r.important);
    }
    rows.sort(
      (a, b) =>
        importanceRank(a.url, this.homepageUrl) -
        importanceRank(b.url, this.homepageUrl),
    );
    const urls = rows.map((r) => r.url);
    return opts.limit != null ? urls.slice(0, opts.limit) : urls;
  }

  /** Prefer 403 / anti-bot failures for Scrape.do rescue. */
  rescueCandidates(limit: number): string[] {
    const rows = [...this.failed.values()].filter((r) => {
      if (r.statusCode === 404) return false;
      return (
        r.statusCode === 403 ||
        /403|anti_bot|blocked|captcha|challenge|timeout|provider/i.test(r.reason)
      );
    });
    rows.sort(
      (a, b) =>
        importanceRank(a.url, this.homepageUrl) -
        importanceRank(b.url, this.homepageUrl),
    );
    // Also include important missing pages even if not 403
    const important = this.failedUrls({ importantOnly: true, limit });
    const out: string[] = [];
    const seen = new Set<string>();
    for (const u of [...rows.map((r) => r.url), ...important]) {
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
      if (out.length >= limit) break;
    }
    return out;
  }

  toArray(): ScrapedPage[] {
    const pages = [...this.pages.values()];
    pages.sort(
      (a, b) =>
        importanceRank(a.url, this.homepageUrl) -
          importanceRank(b.url, this.homepageUrl) ||
        scorePageQuality(b) - scorePageQuality(a),
    );
    return pages;
  }

  hasHomepage(): boolean {
    return this.toArray().some((p) => p.pageType === "homepage");
  }

  totalUsefulChars(): number {
    return this.toArray().reduce((n, p) => n + p.markdown.trim().length, 0);
  }

  providerDistribution(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const page of this.pages.values()) {
      const src = String(
        page.metadata?.sourceProvider ?? page.metadata?.source ?? "unknown",
      );
      out[src] = (out[src] ?? 0) + 1;
    }
    return out;
  }
}

export function meetsMinimumViableCorpus(
  map: SuccessfulPageMap,
  profile: string,
): { ok: boolean; partial: boolean; reason: string } {
  const pages = map.toArray();
  const minPages = profile === "quick" ? 3 : 5;
  const minChars = profile === "quick" ? 1_500 : 4_000;

  if (pages.length === 0) {
    return { ok: false, partial: false, reason: "no_pages" };
  }

  const hasHome = map.hasHomepage() || pages.length >= minPages;
  const enoughPages = pages.length >= minPages;
  const enoughChars = map.totalUsefulChars() >= minChars;

  if (hasHome && (enoughPages || enoughChars)) {
    const partial = map.failedCount > 0;
    return {
      ok: true,
      partial,
      reason: partial ? "partial_with_failures" : "complete",
    };
  }

  // Soft: at least homepage + some content
  if (map.hasHomepage() && map.totalUsefulChars() >= 800) {
    return { ok: true, partial: true, reason: "homepage_plus_thin" };
  }

  return { ok: false, partial: false, reason: "below_minimum" };
}
