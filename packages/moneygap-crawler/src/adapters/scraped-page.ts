import type { PageRecord, ScrapedPage } from "../types/index.js";

export function toScrapedPage(page: PageRecord): ScrapedPage {
  return {
    url: page.finalUrl || page.url,
    pageType: page.pageType,
    title: page.title,
    markdown: page.markdown,
    metadata: {
      description: page.description,
      headings: page.headings,
      canonical: page.canonical,
      openGraph: page.openGraph,
      schemaTypes: page.schemaTypes,
      framework: page.framework,
      language: page.language,
      statusCode: page.statusCode,
      renderedWith: page.renderedWith,
      fetchMs: page.fetchMs,
      internalLinkCount: page.internalLinks.length,
      externalLinkCount: page.externalLinks.length,
      imageCount: page.images.length,
      source: "moneygap-crawler",
    },
  };
}

export function toScrapedPages(pages: PageRecord[]): ScrapedPage[] {
  return pages
    .filter((p) => p.markdown.trim().length >= 40 && !p.error)
    .map(toScrapedPage);
}
