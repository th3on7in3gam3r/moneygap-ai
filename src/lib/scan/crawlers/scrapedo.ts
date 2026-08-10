import { classifyCrawlPageType } from "./classify-page";
import { validatePageContent } from "./content-validate";
import { CrawlProviderError } from "./errors";
import type { ScrapedPage } from "./page-types";
import { fetchWithTimeout } from "./timeout";

const SCRAPE_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 2;

function getToken(): string | null {
  return (
    process.env.SCRAPEDO_API_TOKEN?.trim() ||
    process.env.SCRAPE_DO_API_TOKEN?.trim() ||
    null
  );
}

export function isScrapeDoConfigured(): boolean {
  return Boolean(getToken());
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("token")) u.searchParams.set("token", "[redacted]");
    return u.toString();
  } catch {
    return "[redacted]";
  }
}

function htmlToMarkdownLite(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim().slice(0, 300) || null;
}

/**
 * Rescue fetch a single URL via Scrape.do.
 * Documented API: GET https://api.scrape.do/?token=TOKEN&url=URL&render=true
 * Token must never appear in logs.
 */
export async function scrapeDoFetchPage(
  targetUrl: string,
  homepageUrl: string,
): Promise<ScrapedPage | null> {
  const token = getToken();
  if (!token) {
    throw new CrawlProviderError(
      "Scrape.do unavailable: SCRAPEDO_API_TOKEN not configured",
      { errorClass: "provider", provider: "scrapedo", retryable: true },
    );
  }

  const api = new URL("https://api.scrape.do/");
  api.searchParams.set("token", token);
  api.searchParams.set("url", targetUrl);
  api.searchParams.set("render", "true");

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.info("[PROVIDER]", {
        provider: "scrapedo",
        event: "request",
        url: targetUrl,
        attempt,
        api: redactUrl(api.toString()),
      });

      const res = await fetchWithTimeout(api.toString(), {
        method: "GET",
        timeoutMs: SCRAPE_TIMEOUT_MS,
        headers: { Accept: "text/html,application/json,*/*" },
      });

      if (res.status === 404) {
        throw new CrawlProviderError(`Scrape.do target 404: ${targetUrl}`, {
          errorClass: "empty",
          provider: "scrapedo",
          retryable: false,
        });
      }

      if (res.status === 429) {
        throw new CrawlProviderError("Scrape.do rate limited", {
          errorClass: "rate_limit",
          provider: "scrapedo",
          retryable: true,
        });
      }

      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 200);
        throw new CrawlProviderError(
          `Scrape.do HTTP ${res.status}${body ? `: ${body}` : ""}`,
          {
            errorClass: res.status === 403 ? "anti_bot" : "provider",
            provider: "scrapedo",
            retryable: true,
          },
        );
      }

      const html = await res.text();
      const title = extractTitle(html);
      const markdown = htmlToMarkdownLite(html).slice(0, 24_000);
      const validation = validatePageContent({
        markdown,
        html,
        title,
        statusCode: 200,
      });
      if (!validation.ok) {
        throw new CrawlProviderError(
          `Scrape.do content invalid: ${validation.reason}`,
          {
            errorClass: "empty",
            provider: "scrapedo",
            retryable: false,
          },
        );
      }

      return {
        url: targetUrl,
        pageType: classifyCrawlPageType(targetUrl, homepageUrl),
        title,
        markdown,
        metadata: {
          source: "scrapedo",
          sourceProvider: "scrapedo",
          statusCode: 200,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      lastErr = err;
      if (err instanceof CrawlProviderError && !err.retryable) throw err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt + Math.random() * 200));
      }
    }
  }

  if (lastErr instanceof CrawlProviderError) throw lastErr;
  throw new CrawlProviderError(
    lastErr instanceof Error ? lastErr.message : "Scrape.do failed",
    { errorClass: "provider", provider: "scrapedo", retryable: true, cause: lastErr },
  );
}

export async function scrapeDoRescueUrls(
  urls: string[],
  homepageUrl: string,
): Promise<{ pages: ScrapedPage[]; failed: string[] }> {
  const pages: ScrapedPage[] = [];
  const failed: string[] = [];
  if (!isScrapeDoConfigured()) {
    return { pages, failed: [...urls] };
  }

  for (const url of urls) {
    try {
      const page = await scrapeDoFetchPage(url, homepageUrl);
      if (page) pages.push(page);
      else failed.push(url);
    } catch (err) {
      console.info("[RECOVERY]", {
        provider: "scrapedo",
        url,
        event: "fail",
        reason: err instanceof Error ? err.message : String(err),
      });
      failed.push(url);
      // 404 / non-retryable: do not storm
      if (err instanceof CrawlProviderError && !err.retryable) continue;
    }
  }

  console.info("[RECOVERY]", {
    provider: "scrapedo",
    requested: urls.length,
    recovered: pages.length,
  });

  return { pages, failed };
}
