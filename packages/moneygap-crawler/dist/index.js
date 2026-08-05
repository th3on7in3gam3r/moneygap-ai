var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/framework-detectors/index.ts
var framework_detectors_exports = {};
__export(framework_detectors_exports, {
  detectFramework: () => detectFramework
});
function detectFramework(html) {
  const signals = [];
  const lower = html.slice(0, 2e5).toLowerCase();
  let framework = "unknown";
  let needsJs = false;
  if (lower.includes("__next_data__") || lower.includes("/_next/static") || lower.includes('id="__next"')) {
    framework = "nextjs";
    signals.push("nextjs");
  } else if (lower.includes("__nuxt") || lower.includes("/_nuxt/")) {
    framework = "nuxt";
    signals.push("nuxt");
  } else if (lower.includes("data-astro-cid") || lower.includes("astro-island")) {
    framework = "astro";
    signals.push("astro");
  } else if (lower.includes("ng-version") || lower.includes("ng-app")) {
    framework = "angular";
    signals.push("angular");
    needsJs = true;
  } else if (lower.includes("data-sveltekit") || lower.includes("__sveltekit")) {
    framework = "sveltekit";
    signals.push("sveltekit");
  } else if (lower.includes('id="root"') && (lower.includes("react") || lower.includes("data-reactroot"))) {
    framework = "react";
    signals.push("react-spa");
    needsJs = true;
  } else if (lower.includes("data-v-") && lower.includes("vue")) {
    framework = "vue";
    signals.push("vue");
  }
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const hasEmptyRoot = /<div[^>]+id=["']?(?:root|app|__next)["']?[^>]*>\s*<\/div>/i.test(html) || /<div[^>]+id=["']?(?:root|app|__next)["']?[^>]*>\s*<noscript>/i.test(html);
  if (hasEmptyRoot && bodyText.length < 400) {
    needsJs = true;
    signals.push("empty-root");
  }
  if (bodyText.length < 120 && /<script/i.test(html)) {
    needsJs = true;
    signals.push("thin-body");
  }
  if (framework === "nextjs" && lower.includes("__next_data__") && bodyText.length > 400) {
    needsJs = false;
  }
  if (framework === "astro" && bodyText.length > 400) {
    needsJs = false;
  }
  return { framework, needsJs, signals };
}
var init_framework_detectors = __esm({
  "src/framework-detectors/index.ts"() {
    "use strict";
  }
});

// src/crawl.ts
import PQueue from "p-queue";

// src/adapters/scraped-page.ts
function toScrapedPage(page) {
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
      source: "moneygap-crawler"
    }
  };
}
function toScrapedPages(pages) {
  return pages.filter((p) => p.markdown.trim().length >= 40 && !p.error).map(toScrapedPage);
}

// src/cache/memory.ts
var MemoryCache = class {
  store = /* @__PURE__ */ new Map();
  get(key) {
    const hit = this.store.get(key);
    if (!hit) return void 0;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return void 0;
    }
    return hit.value;
  }
  set(key, value, ttlMs) {
    if (ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  clear() {
    this.store.clear();
  }
};
var globalCrawlCache = new MemoryCache();

// src/discovery/normalize.ts
import normalizeUrlLib from "normalize-url";
function normalizeCrawlUrl(raw, opts) {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalizeUrlLib(withProto, {
    stripHash: opts?.stripHash ?? true,
    removeQueryParameters: false,
    stripWWW: false,
    forceHttps: false
  });
}
function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}
function resolveUrl(base, href) {
  try {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return null;
    }
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return normalizeCrawlUrl(u.href);
  } catch {
    return null;
  }
}
function originOf(url) {
  return new URL(url).origin;
}

// src/discovery/prioritize.ts
var PAGE_TYPE_PATTERNS = [
  { type: "about", patterns: [/\/about(?:-us)?(?:\/|$)/i, /\/company(?:\/|$)/i, /\/our-story(?:\/|$)/i] },
  { type: "services", patterns: [/\/services?(?:\/|$)/i, /\/solutions?(?:\/|$)/i, /\/what-we-do(?:\/|$)/i] },
  { type: "products", patterns: [/\/products?(?:\/|$)/i, /\/shop(?:\/|$)/i, /\/store(?:\/|$)/i, /\/catalog(?:\/|$)/i] },
  { type: "pricing", patterns: [/\/pricing(?:\/|$)/i, /\/plans?(?:\/|$)/i, /\/packages?(?:\/|$)/i] },
  { type: "blog", patterns: [/\/blog(?:\/|$)/i, /\/news(?:\/|$)/i, /\/articles?(?:\/|$)/i, /\/insights?(?:\/|$)/i] },
  { type: "contact", patterns: [/\/contact(?:-us)?(?:\/|$)/i, /\/get-in-touch(?:\/|$)/i, /\/support(?:\/|$)/i] },
  { type: "faq", patterns: [/\/faq(?:\/|$)/i, /\/help(?:\/|$)/i, /\/questions?(?:\/|$)/i] },
  {
    type: "resources",
    patterns: [/\/resources?(?:\/|$)/i, /\/guides?(?:\/|$)/i, /\/docs?(?:\/|$)/i, /\/learn(?:\/|$)/i, /\/library(?:\/|$)/i]
  }
];
var PRIORITY = {
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
  other: 10
};
var QUICK_TYPES = [
  "homepage",
  "about",
  "services",
  "products",
  "pricing",
  "contact"
];
function classifyPageType(url, homepageUrl) {
  try {
    const parsed = new URL(url);
    const home = new URL(homepageUrl);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (parsed.origin === home.origin && (path === "/" || path === "")) {
      return "homepage";
    }
  } catch {
  }
  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return type;
  }
  return "other";
}
function prioritizeUrls(homepage, candidates, limit, mode) {
  const home = homepage.replace(/\/$/, "");
  const scored = candidates.map((url) => {
    const type = classifyPageType(url, homepage);
    return { url, type, score: PRIORITY[type] };
  });
  scored.sort((a, b) => a.score - b.score);
  if (mode === "quick") {
    const selected2 = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of scored) {
      if (!QUICK_TYPES.includes(item.type)) continue;
      if (seen.has(item.type) && item.type !== "homepage") continue;
      seen.add(item.type);
      selected2.push(item.url);
      if (selected2.length >= Math.min(limit, 12)) break;
    }
    if (!selected2.some((u) => classifyPageType(u, homepage) === "homepage")) {
      selected2.unshift(homepage);
    }
    return Array.from(new Set(selected2)).slice(0, limit);
  }
  const selected = [];
  const seenTypes = /* @__PURE__ */ new Set();
  for (const item of scored) {
    if (item.type === "other" && item.url.replace(/\/$/, "") !== home) continue;
    if (seenTypes.has(item.type) && item.type !== "blog" && item.type !== "other") continue;
    if (item.type !== "other") seenTypes.add(item.type);
    selected.push(item.url);
    if (selected.length >= limit) break;
  }
  if (!selected.some((u) => classifyPageType(u, homepage) === "homepage")) {
    selected.unshift(homepage);
  }
  for (const url of candidates) {
    if (selected.length >= limit) break;
    if (!selected.includes(url)) selected.push(url);
  }
  return Array.from(new Set(selected)).slice(0, limit);
}

// src/extractors/html.ts
import * as cheerio from "cheerio";
init_framework_detectors();
function textOf($, sel) {
  const t = $(sel).first().text().replace(/\s+/g, " ").trim();
  return t || null;
}
function meta($, name) {
  const byName = $(`meta[name="${name}"]`).attr("content")?.trim();
  if (byName) return byName;
  const byProp = $(`meta[property="${name}"]`).attr("content")?.trim();
  return byProp || null;
}
function htmlToMarkdownApprox(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const parts = [];
  $("h1, h2, h3, h4, p, li, a").each((_, el) => {
    const tag = el.tagName?.toLowerCase() ?? "";
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
  if (md.length >= 40) return md.slice(0, 24e3);
  const body = $("body").text().replace(/\s+/g, " ").trim();
  return body.slice(0, 24e3);
}
function extractPageRecord(input) {
  const $ = cheerio.load(input.html);
  const detection = detectFramework(input.html);
  const title = textOf($, "title") || meta($, "og:title") || textOf($, "h1");
  const description = meta($, "description") || meta($, "og:description");
  const headings = [];
  $("h1, h2, h3").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
  });
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || resolveUrl(input.finalUrl, $('link[rel="canonical"]').attr("href") ?? "") || null;
  const openGraph = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) openGraph[prop] = content;
  });
  const structuredData = [];
  const schemaTypes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      structuredData.push(parsed);
      const collect = (node) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(collect);
          return;
        }
        const obj = node;
        const t = obj["@type"];
        if (typeof t === "string") schemaTypes.push(t);
        else if (Array.isArray(t)) {
          for (const x of t) if (typeof x === "string") schemaTypes.push(x);
        }
        if (obj["@graph"]) collect(obj["@graph"]);
      };
      collect(parsed);
    } catch {
    }
  });
  const internalLinks = [];
  const externalLinks = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = href ? resolveUrl(input.finalUrl, href) : null;
    if (!resolved) return;
    if (sameOrigin(resolved, input.homepageUrl)) internalLinks.push(resolved);
    else externalLinks.push(resolved);
  });
  const images = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    const resolved = src ? resolveUrl(input.finalUrl, src) : null;
    if (resolved) images.push(resolved);
  });
  const lang = $("html").attr("lang")?.trim() || meta($, "og:locale") || null;
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
    fetchMs: input.fetchMs
  };
}
function harvestLinksFromHtml(html, baseUrl, homepageUrl) {
  const $ = cheerio.load(html);
  const out = /* @__PURE__ */ new Set();
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

// src/progress/tracker.ts
function memoryMb() {
  try {
    return Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
  } catch {
    return null;
  }
}
var ProgressTracker = class {
  constructor(onProgress) {
    this.onProgress = onProgress;
  }
  onProgress;
  errors = [];
  warnings = [];
  started = Date.now();
  processedTimes = [];
  warn(msg) {
    this.warnings.push(msg);
    if (this.warnings.length > 50) this.warnings.shift();
  }
  error(msg) {
    this.errors.push(msg);
    if (this.errors.length > 50) this.errors.shift();
  }
  markProcessed(durationMs) {
    this.processedTimes.push(durationMs);
    if (this.processedTimes.length > 40) this.processedTimes.shift();
  }
  async emit(partial) {
    const avg = this.processedTimes.length > 0 ? this.processedTimes.reduce((a, b) => a + b, 0) / this.processedTimes.length : null;
    const etaMs = avg != null && partial.pagesRemaining > 0 ? Math.round(avg * partial.pagesRemaining) : null;
    const event = {
      phase: partial.phase,
      pagesDiscovered: partial.pagesDiscovered,
      pagesProcessed: partial.pagesProcessed,
      pagesRemaining: partial.pagesRemaining,
      pagesFailed: partial.pagesFailed ?? this.errors.length,
      currentUrl: partial.currentUrl ?? null,
      etaMs,
      memoryMb: memoryMb(),
      errors: [...this.errors],
      warnings: [...this.warnings],
      message: partial.message
    };
    await this.onProgress?.(event);
    return event;
  }
  durationMs() {
    return Date.now() - this.started;
  }
  getWarnings() {
    return [...this.warnings];
  }
};

// src/queue/memory.ts
var InMemoryCrawlQueue = class {
  items = /* @__PURE__ */ new Map();
  order = [];
  enqueue(url, depth) {
    if (this.items.has(url)) return false;
    this.items.set(url, { url, depth, state: "queued", attempts: 0 });
    this.order.push(url);
    return true;
  }
  has(url) {
    return this.items.has(url);
  }
  size() {
    return this.items.size;
  }
  countByState(state) {
    let n = 0;
    for (const item of this.items.values()) if (item.state === state) n++;
    return n;
  }
  nextQueued() {
    for (const url of this.order) {
      const item = this.items.get(url);
      if (item?.state === "queued" || item?.state === "retry") return item;
    }
    return null;
  }
  mark(url, state, lastError) {
    const item = this.items.get(url);
    if (!item) return;
    if (state === "processing" && item.state !== "processing") {
      item.attempts += 1;
    }
    item.state = state;
    if (lastError) item.lastError = lastError;
  }
  snapshot() {
    return this.order.map((u) => this.items.get(u)).filter(Boolean);
  }
};
function backoffMs(attempt, baseMs = 400) {
  const exp = Math.min(8, Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return baseMs * 2 ** exp + jitter;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function isTransientError(statusCode, message) {
  if (statusCode === 429 || statusCode === 503 || statusCode === 502 || statusCode === 504) {
    return true;
  }
  const m = (message ?? "").toLowerCase();
  return m.includes("timeout") || m.includes("econnreset") || m.includes("socket");
}

// src/renderers/fetch-static.ts
async function fetchText(url, opts) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": opts.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > opts.maxBytes) {
      return {
        ok: false,
        error: `Response too large (${buf.byteLength} bytes)`,
        statusCode: res.status,
        fetchMs: Date.now() - started
      };
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const headers = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return {
      ok: true,
      text,
      statusCode: res.status,
      finalUrl: res.url || url,
      headers,
      fetchMs: Date.now() - started
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "Request timed out" : err instanceof Error ? err.message : String(err),
      fetchMs: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

// src/renderers/playwright.ts
init_framework_detectors();
var browserPromise = null;
async function getBrowser() {
  try {
    const pw = await import("playwright");
    if (!browserPromise) {
      browserPromise = pw.chromium.launch({
        headless: true,
        args: ["--disable-dev-shm-usage", "--no-sandbox"]
      });
    }
    return await browserPromise;
  } catch {
    browserPromise = null;
    return null;
  }
}
async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
  } finally {
    browserPromise = null;
  }
}
async function renderWithPlaywright(url, opts) {
  const browser = await getBrowser();
  if (!browser) return null;
  const started = Date.now();
  const context = await browser.newContext({
    userAgent: opts.userAgent,
    javaScriptEnabled: true
  });
  try {
    const page = await context.newPage();
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: opts.timeoutMs
    });
    await page.waitForTimeout(400);
    const html = await page.content();
    return {
      html,
      finalUrl: page.url(),
      statusCode: res?.status() ?? 200,
      fetchMs: Date.now() - started,
      renderedWith: "playwright"
    };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => void 0);
  }
}
function shouldUsePlaywright(html, playwrightEnabled) {
  if (!playwrightEnabled) return false;
  return detectFramework(html).needsJs;
}

// src/robots/index.ts
import robotsParser from "robots-parser";
async function loadRobots(origin, opts) {
  const robotsUrl = `${origin.replace(/\/$/, "")}/robots.txt`;
  const cacheKey = `robots:${robotsUrl}`;
  const cached = opts.cache.get(cacheKey);
  let raw = cached ?? null;
  if (raw == null) {
    const res = await fetchText(robotsUrl, {
      timeoutMs: opts.timeoutMs,
      maxBytes: 512e3,
      userAgent: opts.userAgent,
      maxRedirects: 5
    });
    raw = res.ok && res.statusCode < 400 ? res.text : "";
    opts.cache.set(cacheKey, raw, opts.cacheTtlMs);
  }
  const parser2 = robotsParser(robotsUrl, raw || "");
  const delaySec = parser2.getCrawlDelay(opts.userAgent) ?? parser2.getCrawlDelay("*");
  const sitemaps = parser2.getSitemaps?.() ?? [];
  return {
    raw: raw || null,
    sitemaps,
    crawlDelayMs: delaySec != null ? Math.round(Number(delaySec) * 1e3) : 0,
    isAllowed: (url) => {
      try {
        return parser2.isAllowed(url, opts.userAgent) !== false;
      } catch {
        return true;
      }
    }
  };
}

// src/sitemaps/index.ts
import { XMLParser } from "fast-xml-parser";
var parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});
function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
function parseSitemapXml(xml, baseUrl) {
  const urls = [];
  const childSitemaps = [];
  let doc;
  try {
    doc = parser.parse(xml);
  } catch {
    return { urls, childSitemaps };
  }
  const root = doc;
  const urlset = root.urlset;
  const sitemapindex = root.sitemapindex;
  if (urlset) {
    for (const entry of asArray(urlset.url)) {
      const loc = typeof entry?.loc === "string" ? entry.loc.trim() : "";
      const resolved = loc ? resolveUrl(baseUrl, loc) : null;
      if (resolved) urls.push(resolved);
    }
  }
  if (sitemapindex) {
    for (const entry of asArray(
      sitemapindex.sitemap
    )) {
      const loc = typeof entry?.loc === "string" ? entry.loc.trim() : "";
      const resolved = loc ? resolveUrl(baseUrl, loc) : null;
      if (resolved) childSitemaps.push(resolved);
    }
  }
  return { urls, childSitemaps };
}
async function discoverSitemapUrls(origin, opts) {
  const maxSitemaps = opts.maxSitemaps ?? 10;
  const maxUrls = opts.maxUrls ?? 2e3;
  const seeds = [
    ...opts.extraSitemapUrls ?? [],
    `${origin.replace(/\/$/, "")}/sitemap.xml`,
    `${origin.replace(/\/$/, "")}/sitemap_index.xml`
  ];
  const seenMaps = /* @__PURE__ */ new Set();
  const queue = [...seeds];
  const found = /* @__PURE__ */ new Set();
  while (queue.length > 0 && seenMaps.size < maxSitemaps && found.size < maxUrls) {
    const mapUrl = queue.shift();
    if (seenMaps.has(mapUrl)) continue;
    seenMaps.add(mapUrl);
    const cacheKey = `sitemap:${mapUrl}`;
    let xml = opts.cache.get(cacheKey);
    if (xml == null) {
      const res = await fetchText(mapUrl, {
        timeoutMs: opts.timeoutMs,
        maxBytes: 5e6,
        userAgent: opts.userAgent,
        maxRedirects: 5
      });
      if (!res.ok || res.statusCode >= 400) continue;
      xml = res.text;
      opts.cache.set(cacheKey, xml, opts.cacheTtlMs);
    }
    const { urls, childSitemaps } = parseSitemapXml(xml, mapUrl);
    for (const u of urls) {
      found.add(u);
      if (found.size >= maxUrls) break;
    }
    for (const child of childSitemaps) {
      if (!seenMaps.has(child)) queue.push(child);
    }
  }
  return Array.from(found);
}

// src/types/index.ts
import { z } from "zod";
var CrawlModeSchema = z.enum(["quick", "standard", "deep"]);
var PageTypeSchema = z.enum([
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
  "other"
]);
var QueueStateSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "retry",
  "failed",
  "cancelled"
]);
var CrawlConfigSchema = z.object({
  url: z.string().url(),
  mode: CrawlModeSchema.default("standard"),
  maxPages: z.number().int().positive().max(5e4).default(25),
  maxDepth: z.number().int().min(0).max(20).default(4),
  maxRuntimeMs: z.number().int().positive().default(14e4),
  maxRedirects: z.number().int().min(0).max(20).default(8),
  maxRetries: z.number().int().min(0).max(8).default(3),
  maxResponseBytes: z.number().int().positive().default(2e6),
  concurrency: z.number().int().positive().max(50).default(10),
  crawlDelayMs: z.number().int().min(0).default(0),
  allowExternal: z.boolean().default(false),
  playwrightEnabled: z.boolean().default(false),
  discoverOnly: z.boolean().default(false),
  userAgent: z.string().default("MoneyGapCrawler/0.1 (+https://moneygap-ai.com)"),
  cacheTtlMs: z.number().int().min(0).default(15 * 6e4),
  jobId: z.string().optional()
});

// src/crawl.ts
async function crawlSite(input, opts) {
  const config = CrawlConfigSchema.parse(input);
  const homepage = normalizeCrawlUrl(config.url);
  const origin = originOf(homepage);
  const tracker = new ProgressTracker(opts?.onProgress);
  const queue = new InMemoryCrawlQueue();
  const pages = [];
  const deadline = Date.now() + config.maxRuntimeMs;
  const budgetExceeded = () => Date.now() >= deadline || opts?.signal?.aborted === true;
  await tracker.emit({
    phase: "normalize",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    currentUrl: homepage,
    message: `Normalized ${homepage}`
  });
  await tracker.emit({
    phase: "robots",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    message: "Reading robots.txt"
  });
  const robots = await loadRobots(origin, {
    userAgent: config.userAgent,
    timeoutMs: 12e3,
    cache: globalCrawlCache,
    cacheTtlMs: config.cacheTtlMs
  });
  const delayMs = Math.max(config.crawlDelayMs, robots.crawlDelayMs);
  await tracker.emit({
    phase: "sitemap",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    message: "Discovering sitemaps"
  });
  let sitemapUrls = [];
  try {
    sitemapUrls = await discoverSitemapUrls(origin, {
      userAgent: config.userAgent,
      timeoutMs: 15e3,
      cache: globalCrawlCache,
      cacheTtlMs: config.cacheTtlMs,
      extraSitemapUrls: robots.sitemaps,
      maxSitemaps: config.mode === "deep" ? 25 : 8,
      maxUrls: config.mode === "deep" ? 5e3 : 800
    });
  } catch (err) {
    tracker.warn(
      `Sitemap discovery soft-failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const discovered = /* @__PURE__ */ new Set([homepage, ...sitemapUrls.filter((u) => sameOrigin(u, homepage))]);
  await tracker.emit({
    phase: "discover",
    pagesDiscovered: discovered.size,
    pagesProcessed: 0,
    pagesRemaining: Math.min(discovered.size, config.maxPages),
    message: `Discovered ${discovered.size} URLs`
  });
  try {
    const homeFetch = await fetchText(homepage, {
      timeoutMs: 18e3,
      maxBytes: config.maxResponseBytes,
      userAgent: config.userAgent,
      maxRedirects: config.maxRedirects
    });
    if (homeFetch.ok) {
      for (const link of harvestLinksFromHtml(homeFetch.text, homeFetch.finalUrl, homepage)) {
        discovered.add(link);
      }
    }
  } catch (err) {
    tracker.warn(`Homepage link harvest soft-failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  const prioritized = prioritizeUrls(
    homepage,
    Array.from(discovered).filter((u) => robots.isAllowed(u)),
    config.maxPages,
    config.mode
  );
  for (const url of prioritized) {
    queue.enqueue(url, url === homepage ? 0 : 1);
  }
  await tracker.emit({
    phase: "queue",
    pagesDiscovered: discovered.size,
    pagesProcessed: 0,
    pagesRemaining: queue.countByState("queued"),
    message: `Queued ${queue.countByState("queued")} pages (${config.mode})`
  });
  const pQueue = new PQueue({ concurrency: config.concurrency });
  async function processUrl(url, depth) {
    if (budgetExceeded()) {
      queue.mark(url, "cancelled");
      return;
    }
    if (!robots.isAllowed(url)) {
      queue.mark(url, "cancelled", "robots.txt disallowed");
      return;
    }
    await tracker.emit({
      phase: "extract",
      pagesDiscovered: discovered.size,
      pagesProcessed: pages.length,
      pagesRemaining: queue.countByState("queued") + queue.countByState("retry"),
      currentUrl: url,
      message: `Extracting ${url}`
    });
    if (delayMs > 0) await sleep(delayMs);
    const maxAttempts = config.maxRetries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const staticRes = await fetchText(url, {
        timeoutMs: 2e4,
        maxBytes: config.maxResponseBytes,
        userAgent: config.userAgent,
        maxRedirects: config.maxRedirects
      });
      if (!staticRes.ok) {
        if (isTransientError(staticRes.statusCode, staticRes.error) && attempt < maxAttempts) {
          queue.mark(url, "retry", staticRes.error);
          await sleep(backoffMs(attempt));
          queue.mark(url, "processing");
          continue;
        }
        tracker.error(`${url}: ${staticRes.error}`);
        queue.mark(url, "failed", staticRes.error);
        return;
      }
      if (staticRes.statusCode === 403 || staticRes.statusCode === 404) {
        tracker.error(`${url}: HTTP ${staticRes.statusCode}`);
        queue.mark(url, "failed", `HTTP ${staticRes.statusCode}`);
        return;
      }
      let html = staticRes.text;
      let finalUrl = staticRes.finalUrl;
      let statusCode = staticRes.statusCode;
      let fetchMs = staticRes.fetchMs;
      let renderedWith = "cheerio";
      if (shouldUsePlaywright(html, config.playwrightEnabled)) {
        const pw = await renderWithPlaywright(url, {
          timeoutMs: 25e3,
          userAgent: config.userAgent
        });
        if (pw) {
          html = pw.html;
          finalUrl = pw.finalUrl;
          statusCode = pw.statusCode;
          fetchMs = pw.fetchMs;
          renderedWith = "playwright";
        } else {
          tracker.warn(`Playwright unavailable for ${url}; using static HTML`);
        }
      }
      const pageType = classifyPageType(finalUrl || url, homepage);
      const record = extractPageRecord({
        url,
        finalUrl,
        html,
        statusCode,
        pageType,
        fetchMs,
        renderedWith,
        homepageUrl: homepage
      });
      if (record.markdown.trim().length < 40) {
        tracker.warn(`Thin content skipped: ${url}`);
        queue.mark(url, "failed", "thin content");
        return;
      }
      pages.push(record);
      tracker.markProcessed(fetchMs);
      queue.mark(url, "completed");
      if ((config.mode === "standard" || config.mode === "deep") && depth < config.maxDepth && pages.length < config.maxPages) {
        for (const link of record.internalLinks) {
          if (!robots.isAllowed(link)) continue;
          if (!config.allowExternal && !sameOrigin(link, homepage)) continue;
          if (queue.has(link)) continue;
          if (queue.size() >= config.maxPages * 3) break;
          discovered.add(link);
          if (pages.length + queue.countByState("queued") < config.maxPages) {
            queue.enqueue(link, depth + 1);
          }
        }
      }
      return;
    }
  }
  try {
    while (!budgetExceeded() && pages.length < config.maxPages) {
      const next = queue.nextQueued();
      if (!next) {
        await pQueue.onIdle();
        if (!queue.nextQueued()) break;
        continue;
      }
      queue.mark(next.url, "processing");
      void pQueue.add(() => processUrl(next.url, next.depth));
      if (pQueue.size + pQueue.pending >= config.concurrency) {
        await pQueue.onSizeLessThan(config.concurrency);
      }
    }
    await pQueue.onIdle();
  } finally {
    await closeBrowser();
  }
  let scraped = toScrapedPages(pages);
  if (scraped.length > 0 && !scraped.some((p) => p.pageType === "homepage")) {
    scraped = [{ ...scraped[0], pageType: "homepage" }, ...scraped.slice(1)];
  }
  const finalProgress = await tracker.emit({
    phase: scraped.length > 0 ? "complete" : "failed",
    pagesDiscovered: discovered.size,
    pagesProcessed: scraped.length,
    pagesRemaining: 0,
    pagesFailed: queue.countByState("failed"),
    message: scraped.length > 0 ? `Crawl complete: ${scraped.length} pages` : "Crawl produced no usable pages"
  });
  return {
    pages,
    scraped,
    progress: finalProgress,
    durationMs: tracker.durationMs(),
    mode: config.mode,
    warnings: tracker.getWarnings()
  };
}
async function loadPageHtml(url, opts) {
  const homepage = normalizeCrawlUrl(url);
  const res = await fetchText(homepage, {
    timeoutMs: opts?.timeoutMs ?? 15e3,
    maxBytes: opts?.maxBytes ?? 15e5,
    userAgent: opts?.userAgent ?? "MoneyGapCrawler/0.1 (+https://moneygap-ai.com)",
    maxRedirects: 8
  });
  if (!res.ok) return null;
  let html = res.text;
  let finalUrl = res.finalUrl;
  let statusCode = res.statusCode;
  let fetchMs = res.fetchMs;
  let renderedWith = "cheerio";
  if (shouldUsePlaywright(html, opts?.playwrightEnabled === true)) {
    const pw = await renderWithPlaywright(homepage, {
      timeoutMs: opts?.timeoutMs ?? 2e4,
      userAgent: opts?.userAgent ?? "MoneyGapCrawler/0.1 (+https://moneygap-ai.com)"
    });
    if (pw) {
      html = pw.html;
      finalUrl = pw.finalUrl;
      statusCode = pw.statusCode;
      fetchMs = pw.fetchMs;
      renderedWith = "playwright";
    }
    await closeBrowser();
  }
  const { detectFramework: detectFramework2 } = await Promise.resolve().then(() => (init_framework_detectors(), framework_detectors_exports));
  return {
    html,
    finalUrl,
    statusCode,
    fetchMs,
    renderedWith,
    framework: detectFramework2(html).framework
  };
}
async function extractSinglePage(url, opts) {
  const loaded = await loadPageHtml(url, opts);
  if (!loaded) return null;
  const homepage = normalizeCrawlUrl(url);
  return extractPageRecord({
    url: homepage,
    finalUrl: loaded.finalUrl,
    html: loaded.html,
    statusCode: loaded.statusCode,
    pageType: "homepage",
    fetchMs: loaded.fetchMs,
    renderedWith: loaded.renderedWith,
    homepageUrl: homepage
  });
}

// src/discovery-only.ts
init_framework_detectors();
async function discoverOnly(input) {
  const started = Date.now();
  const config = CrawlConfigSchema.parse({ ...input, discoverOnly: true });
  const homepage = normalizeCrawlUrl(config.url);
  const origin = originOf(homepage);
  const warnings = [];
  const robots = await loadRobots(origin, {
    userAgent: config.userAgent,
    timeoutMs: 1e4,
    cache: globalCrawlCache,
    cacheTtlMs: config.cacheTtlMs
  });
  let sitemapUrls = [];
  try {
    sitemapUrls = await discoverSitemapUrls(origin, {
      userAgent: config.userAgent,
      timeoutMs: 12e3,
      cache: globalCrawlCache,
      cacheTtlMs: config.cacheTtlMs,
      extraSitemapUrls: robots.sitemaps,
      maxSitemaps: config.mode === "deep" ? 25 : 8,
      maxUrls: Math.min(config.maxPages * 4, config.mode === "deep" ? 5e4 : 2e3)
    });
  } catch (err) {
    warnings.push(
      `Sitemap soft-fail: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const discovered = /* @__PURE__ */ new Set([
    homepage,
    ...sitemapUrls.filter((u) => sameOrigin(u, homepage))
  ]);
  let framework = "unknown";
  let jsRequired = false;
  let homepageLinkCount = 0;
  try {
    const homeFetch = await fetchText(homepage, {
      timeoutMs: 12e3,
      maxBytes: config.maxResponseBytes,
      userAgent: config.userAgent,
      maxRedirects: config.maxRedirects
    });
    if (homeFetch.ok) {
      const detection = detectFramework(homeFetch.text);
      framework = detection.framework;
      jsRequired = detection.needsJs;
      const links = harvestLinksFromHtml(
        homeFetch.text,
        homeFetch.finalUrl,
        homepage
      );
      homepageLinkCount = links.length;
      for (const link of links) discovered.add(link);
    }
  } catch (err) {
    warnings.push(
      `Homepage harvest soft-fail: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  const allowed = Array.from(discovered).filter((u) => robots.isAllowed(u));
  const prioritized = prioritizeUrls(
    homepage,
    allowed,
    config.maxPages,
    config.mode
  );
  void classifyPageType;
  return {
    homepage,
    urls: prioritized,
    sitemapFound: sitemapUrls.length > 0 || robots.sitemaps.length > 0,
    sitemapUrlCount: sitemapUrls.length,
    robotsFound: Boolean(robots.raw && robots.raw.length > 10),
    framework,
    jsRequired,
    homepageLinkCount,
    warnings,
    durationMs: Date.now() - started
  };
}

// src/index.ts
init_framework_detectors();
export {
  CrawlConfigSchema,
  CrawlModeSchema,
  InMemoryCrawlQueue,
  PageTypeSchema,
  QueueStateSchema,
  backoffMs,
  classifyPageType,
  closeBrowser,
  crawlSite,
  detectFramework,
  discoverOnly,
  discoverSitemapUrls,
  extractSinglePage,
  isTransientError,
  loadPageHtml,
  loadRobots,
  normalizeCrawlUrl,
  parseSitemapXml,
  prioritizeUrls,
  resolveUrl,
  sameOrigin,
  toScrapedPage,
  toScrapedPages
};
//# sourceMappingURL=index.js.map