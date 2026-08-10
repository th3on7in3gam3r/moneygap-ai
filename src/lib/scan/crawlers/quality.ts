import type { ScrapedPage } from "./page-types";
import { validatePageContent } from "./content-validate";

/**
 * Lightweight quality score for choosing the best version of a URL
 * when multiple providers return the same page.
 */
export function scorePageQuality(page: ScrapedPage): number {
  let score = 0;
  const meta = page.metadata ?? {};
  const status =
    typeof meta.statusCode === "number" ? meta.statusCode : 200;
  const validation = validatePageContent({
    markdown: page.markdown,
    title: page.title,
    statusCode: status,
    html: typeof meta.html === "string" ? meta.html : null,
  });

  if (!validation.ok) {
    return Math.min(5, Math.floor(validation.usefulChars / 50));
  }

  if (status >= 200 && status < 300) score += 40;
  else if (status > 0) score += 5;

  if (page.title && page.title.trim().length > 2) score += 15;

  const len = page.markdown.trim().length;
  score += Math.min(35, Math.floor(len / 150));

  if (meta.description) score += 5;
  if (meta.canonical) score += 3;
  if (meta.language) score += 2;

  // Prefer cleaner extractors slightly when scores are close
  const source = String(meta.source ?? meta.sourceProvider ?? "");
  if (source.includes("firecrawl")) score += 3;
  if (source.includes("apify")) score += 2;
  if (source.includes("scrapedo") || source.includes("scrape.do")) score += 1;

  return score;
}

export function isUsefulPage(page: ScrapedPage): boolean {
  const status =
    typeof page.metadata?.statusCode === "number"
      ? (page.metadata.statusCode as number)
      : 200;
  return validatePageContent({
    markdown: page.markdown,
    title: page.title,
    statusCode: status,
  }).ok;
}

export function pickBestPage(a: ScrapedPage, b: ScrapedPage): ScrapedPage {
  return scorePageQuality(b) > scorePageQuality(a) ? b : a;
}
