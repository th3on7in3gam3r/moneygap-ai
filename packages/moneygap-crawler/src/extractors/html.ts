import * as cheerio from "cheerio";
import { resolveUrl, sameOrigin } from "../discovery/normalize.js";
import { detectFramework } from "../framework-detectors/index.js";
import type { PageRecord, PageType } from "../types/index.js";

function textOf($: cheerio.CheerioAPI, sel: string): string | null {
  const t = $(sel).first().text().replace(/\s+/g, " ").trim();
  return t || null;
}

function meta($: cheerio.CheerioAPI, name: string): string | null {
  const byName = $(`meta[name="${name}"]`).attr("content")?.trim();
  if (byName) return byName;
  const byProp = $(`meta[property="${name}"]`).attr("content")?.trim();
  return byProp || null;
}

function htmlToMarkdownApprox(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const parts: string[] = [];
  $("h1, h2, h3, h4, p, li, a").each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() ?? "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;
    if (tag === "h1") parts.push(`# ${text}`);
    else if (tag === "h2") parts.push(`## ${text}`);
    else if (tag === "h3") parts.push(`### ${text}`);
    else if (tag === "h4") parts.push(`#### ${text}`);
    else if (tag === "li") parts.push(`- ${text}`);
    else if (tag === "a") {
      const href = $(el).attr("href");
      parts.push(href ? `[${text}](${href})` : text);
    } else parts.push(text);
  });
  const md = parts.join("\n\n").trim();
  if (md.length >= 40) return md.slice(0, 24_000);
  const body = $("body").text().replace(/\s+/g, " ").trim();
  return body.slice(0, 24_000);
}

export function extractPageRecord(input: {
  url: string;
  finalUrl: string;
  html: string;
  statusCode: number;
  pageType: PageType;
  fetchMs: number;
  renderedWith: "cheerio" | "playwright";
  homepageUrl: string;
}): PageRecord {
  const $ = cheerio.load(input.html);
  const detection = detectFramework(input.html);

  const title =
    textOf($, "title") ||
    meta($, "og:title") ||
    textOf($, "h1");

  const description =
    meta($, "description") || meta($, "og:description");

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
  });

  const canonical =
    $('link[rel="canonical"]').attr("href")?.trim() ||
    resolveUrl(input.finalUrl, $('link[rel="canonical"]').attr("href") ?? "") ||
    null;

  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) openGraph[prop] = content;
  });

  const structuredData: unknown[] = [];
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      structuredData.push(parsed);
      const collect = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(collect);
          return;
        }
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") schemaTypes.push(t);
        else if (Array.isArray(t)) {
          for (const x of t) if (typeof x === "string") schemaTypes.push(x);
        }
        if (obj["@graph"]) collect(obj["@graph"]);
      };
      collect(parsed);
    } catch {
      // ignore malformed JSON-LD
    }
  });

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = href ? resolveUrl(input.finalUrl, href) : null;
    if (!resolved) return;
    if (sameOrigin(resolved, input.homepageUrl)) internalLinks.push(resolved);
    else externalLinks.push(resolved);
  });

  const images: string[] = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    const resolved = src ? resolveUrl(input.finalUrl, src) : null;
    if (resolved) images.push(resolved);
  });

  const lang =
    $("html").attr("lang")?.trim() ||
    meta($, "og:locale") ||
    null;

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    pageType: input.pageType,
    title,
    description,
    headings: headings.slice(0, 40),
    canonical: canonical ? resolveUrl(input.finalUrl, canonical) : null,
    openGraph,
    schemaTypes: Array.from(new Set(schemaTypes)).slice(0, 40),
    internalLinks: Array.from(new Set(internalLinks)).slice(0, 500),
    externalLinks: Array.from(new Set(externalLinks)).slice(0, 200),
    images: Array.from(new Set(images)).slice(0, 100),
    structuredData: structuredData.slice(0, 20),
    framework: detection.framework,
    language: lang,
    statusCode: input.statusCode,
    markdown: htmlToMarkdownApprox(input.html),
    renderedWith: input.renderedWith,
    fetchMs: input.fetchMs,
  };
}

export function harvestLinksFromHtml(
  html: string,
  baseUrl: string,
  homepageUrl: string,
): string[] {
  const $ = cheerio.load(html);
  const out = new Set<string>();
  $("a[href], nav a[href], header a[href], footer a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = href ? resolveUrl(baseUrl, href) : null;
    if (resolved && sameOrigin(resolved, homepageUrl)) out.add(resolved);
  });
  $('link[rel="next"]').each((_, el) => {
    const href = $(el).attr("href");
    const resolved = href ? resolveUrl(baseUrl, href) : null;
    if (resolved && sameOrigin(resolved, homepageUrl)) out.add(resolved);
  });
  return Array.from(out);
}
