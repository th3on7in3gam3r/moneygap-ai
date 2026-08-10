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

// src/worker.ts
import { pathToFileURL } from "url";

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
var STRIP_QUERY_PARAMS = [
  /^utm_/i,
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  /^mc_/i,
  "_ga",
  "_gl",
  "yclid",
  "msclkid",
  "dclid",
  "twclid",
  "li_fat_id",
  "igshid",
  "vero_id"
];
function normalizeCrawlUrl(raw, opts) {
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return normalizeUrlLib(withProto, {
      stripHash: opts?.stripHash ?? true,
      stripWWW: opts?.stripWww ?? false,
      forceHttps: true,
      removeTrailingSlash: true,
      removeQueryParameters: STRIP_QUERY_PARAMS,
      sortQueryParameters: true
    });
  } catch {
    try {
      const u = new URL(withProto);
      u.hash = "";
      u.protocol = "https:";
      return u.href.replace(/\/$/, "") || u.origin;
    } catch {
      return withProto;
    }
  }
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
var DEFAULT_TIMEOUT_MS = 15e3;
async function fetchBytes(url, opts) {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": opts.userAgent,
        Accept: "application/xml,text/xml,application/gzip,*/*;q=0.8",
        "Accept-Encoding": "identity"
      }
    });
    const buf = await res.arrayBuffer();
    if (controller.signal.aborted) {
      return {
        ok: false,
        error: "Request timed out",
        fetchMs: Date.now() - started
      };
    }
    if (buf.byteLength > opts.maxBytes) {
      return {
        ok: false,
        error: `Response too large (${buf.byteLength} bytes)`,
        statusCode: res.status,
        fetchMs: Date.now() - started
      };
    }
    const headers = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return {
      ok: true,
      bytes: new Uint8Array(buf),
      statusCode: res.status,
      finalUrl: res.url || url,
      headers,
      fetchMs: Date.now() - started
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError" || controller.signal.aborted;
    return {
      ok: false,
      error: aborted ? "Request timed out" : err instanceof Error ? err.message : String(err),
      fetchMs: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}
async function fetchText(url, opts) {
  const binary = await fetchBytes(url, opts);
  if (!binary.ok) {
    return {
      ok: false,
      error: binary.error,
      statusCode: binary.statusCode,
      fetchMs: binary.fetchMs
    };
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(binary.bytes);
  return {
    ok: true,
    text,
    statusCode: binary.statusCode,
    finalUrl: binary.finalUrl,
    headers: binary.headers,
    fetchMs: binary.fetchMs
  };
}

// src/renderers/playwright.ts
init_framework_detectors();
var browserPromise = null;
function raceTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
async function getBrowser(launchTimeoutMs) {
  try {
    const pw = await import("playwright");
    if (!browserPromise) {
      browserPromise = raceTimeout(
        pw.chromium.launch({
          headless: true,
          args: ["--disable-dev-shm-usage", "--no-sandbox"]
        }),
        launchTimeoutMs,
        "playwright.launch"
      ).catch((err) => {
        browserPromise = null;
        throw err;
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
    await raceTimeout(browser.close(), 5e3, "playwright.close");
  } catch {
  } finally {
    browserPromise = null;
  }
}
async function renderWithPlaywright(url, opts) {
  const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : 15e3;
  const browser = await getBrowser(Math.min(timeoutMs, 15e3));
  if (!browser) return null;
  const started = Date.now();
  let context = null;
  try {
    context = await raceTimeout(
      browser.newContext({
        userAgent: opts.userAgent,
        javaScriptEnabled: true
      }),
      1e4,
      "playwright.newContext"
    );
    const page = await raceTimeout(context.newPage(), 1e4, "playwright.newPage");
    const res = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs
    });
    await page.waitForTimeout(Math.min(400, timeoutMs));
    const html = await raceTimeout(
      page.content(),
      Math.max(5e3, timeoutMs),
      "playwright.content"
    );
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
    if (context) {
      await raceTimeout(context.close(), 5e3, "playwright.contextClose").catch(
        () => void 0
      );
    }
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
import { gunzipSync } from "zlib";
import { XMLParser } from "fast-xml-parser";
var parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});
var COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/post-sitemap.xml",
  "/page-sitemap.xml",
  "/category-sitemap.xml",
  "/news-sitemap.xml",
  "/image-sitemap.xml",
  "/sitemap.xml.gz",
  "/sitemap_index.xml.gz"
];
var SITEMAP_DISCOVER_BUDGET_MS = 25e3;
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
function looksGzip(url, headers) {
  if (/\.gz(\?|$)/i.test(url)) return true;
  const enc = headers["content-encoding"] ?? "";
  const ctype = headers["content-type"] ?? "";
  return /gzip/i.test(enc) || /gzip|application\/x-gzip/i.test(ctype);
}
function bytesToXml(bytes, url, headers) {
  if (looksGzip(url, headers) || bytes.length >= 2 && bytes[0] === 31 && bytes[1] === 139) {
    try {
      return gunzipSync(Buffer.from(bytes)).toString("utf-8");
    } catch {
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
function clampCrawlDelayMs(delayMs, maxMs = 2e3) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  return Math.min(Math.max(0, delayMs), maxMs);
}
function buildSitemapSeeds(origin, extraSitemapUrls) {
  const base = origin.replace(/\/$/, "");
  const seeds = [
    ...extraSitemapUrls ?? [],
    ...COMMON_SITEMAP_PATHS.map((p) => `${base}${p}`)
  ];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const s of seeds) {
    const key = s.split("#")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
async function discoverSitemapUrls(origin, opts) {
  const maxSitemaps = opts.maxSitemaps ?? 10;
  const maxUrls = opts.maxUrls ?? 2e3;
  const budgetMs = opts.budgetMs ?? SITEMAP_DISCOVER_BUDGET_MS;
  const started = Date.now();
  const seeds = buildSitemapSeeds(origin, opts.extraSitemapUrls);
  const seenMaps = /* @__PURE__ */ new Set();
  const queue = [...seeds];
  const found = /* @__PURE__ */ new Set();
  let mapsOk = 0;
  const emit = async (message, currentUrl = null) => {
    console.info("[Scanner]", message, {
      mapsTried: seenMaps.size,
      mapsOk,
      urlsFound: found.size,
      currentUrl
    });
    await opts.onProgress?.({
      mapsTried: seenMaps.size,
      mapsOk,
      urlsFound: found.size,
      currentUrl,
      message
    });
  };
  await emit(`Looking for sitemap\u2026 (${seeds.length} seed locations)`, null);
  while (queue.length > 0 && seenMaps.size < maxSitemaps && found.size < maxUrls) {
    if (Date.now() - started >= budgetMs) {
      await emit(
        `Sitemap budget reached \u2014 continuing with ${found.size} URLs`,
        null
      );
      break;
    }
    const mapUrl = queue.shift();
    if (seenMaps.has(mapUrl)) continue;
    seenMaps.add(mapUrl);
    await emit(
      found.size > 0 ? `Found ${found.size} URLs\u2026` : `Looking for sitemap\u2026 (${seenMaps.size}/${maxSitemaps})`,
      mapUrl
    );
    const cacheKey = `sitemap:${mapUrl}`;
    let xml = opts.cache.get(cacheKey);
    if (xml == null) {
      const remaining = Math.max(1e3, budgetMs - (Date.now() - started));
      const perFetch = Math.min(opts.timeoutMs, remaining);
      const res = await fetchBytes(mapUrl, {
        timeoutMs: perFetch,
        maxBytes: 5e6,
        userAgent: opts.userAgent,
        maxRedirects: 5
      });
      if (!res.ok || (res.statusCode ?? 0) >= 400) {
        if (!/\.gz(\?|$)/i.test(mapUrl) && /\.xml(\?|$)/i.test(mapUrl)) {
          const gzUrl = mapUrl.replace(/\.xml(\?|$)/i, ".xml.gz$1");
          if (!seenMaps.has(gzUrl)) queue.push(gzUrl);
        }
        continue;
      }
      xml = bytesToXml(res.bytes, mapUrl, res.headers);
      if (!xml.trim()) continue;
      opts.cache.set(cacheKey, xml, opts.cacheTtlMs);
    }
    const { urls, childSitemaps } = parseSitemapXml(xml, mapUrl);
    if (urls.length === 0 && childSitemaps.length === 0) continue;
    mapsOk += 1;
    for (const u of urls) {
      found.add(u);
      if (found.size >= maxUrls) break;
    }
    for (const child of childSitemaps) {
      if (!seenMaps.has(child)) queue.push(child);
    }
    await emit(`Found ${found.size} URLs\u2026`, mapUrl);
  }
  await emit(
    found.size > 0 ? `Found ${found.size} URLs from ${mapsOk} sitemap(s)` : "No sitemap URLs \u2014 using homepage link discovery",
    null
  );
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
  const delayMs = clampCrawlDelayMs(
    Math.max(config.crawlDelayMs, robots.crawlDelayMs)
  );
  await tracker.emit({
    phase: "sitemap",
    pagesDiscovered: 1,
    pagesProcessed: 0,
    pagesRemaining: 1,
    message: "Looking for sitemap\u2026"
  });
  let sitemapUrls = [];
  try {
    sitemapUrls = await discoverSitemapUrls(origin, {
      userAgent: config.userAgent,
      timeoutMs: 1e4,
      cache: globalCrawlCache,
      cacheTtlMs: config.cacheTtlMs,
      extraSitemapUrls: robots.sitemaps,
      maxSitemaps: config.mode === "deep" ? 25 : 8,
      maxUrls: config.mode === "deep" ? 5e3 : 800,
      budgetMs: 25e3,
      onProgress: async (p) => {
        await tracker.emit({
          phase: "sitemap",
          pagesDiscovered: Math.max(1, p.urlsFound),
          pagesProcessed: 0,
          pagesRemaining: Math.max(1, p.urlsFound),
          currentUrl: p.currentUrl ?? void 0,
          message: p.message
        });
      }
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

// src/worker.ts
var MAX_PAGE_ATTEMPTS = 3;
var EXTRACT_TIMEOUT_HINT_MS = 2e4;
async function withPg(fn) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("crawl-worker: DATABASE_URL missing");
    process.exit(1);
  }
  let Client;
  try {
    const mod = await import("pg");
    Client = mod.default?.Client ?? mod.Client;
  } catch {
    console.error("crawl-worker: install `pg` to run the deep crawl worker");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}
async function claimJob() {
  let claimed = null;
  await withPg(async (client) => {
    const res = await client.query(
      `UPDATE crawl_jobs
       SET status = 'processing', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE id = (
         SELECT id FROM crawl_jobs
         WHERE status IN ('queued', 'retry')
         ORDER BY
           CASE WHEN analysis_id IS NOT NULL THEN 0 ELSE 1 END,
           created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, url, mode, max_pages, status, analysis_id`
    );
    const row = res.rows[0];
    if (!row) {
      claimed = null;
      return;
    }
    claimed = {
      id: String(row.id),
      url: String(row.url),
      mode: String(row.mode ?? "deep"),
      max_pages: Number(row.max_pages ?? 200),
      status: String(row.status),
      analysis_id: row.analysis_id ? String(row.analysis_id) : null
    };
  });
  return claimed;
}
async function completeJob(id, ok, error, pageCount) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_jobs
       SET status = $2,
           error = $3,
           page_count = COALESCE($4, page_count),
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id, ok ? "completed" : "failed", error ?? null, pageCount ?? null]
    );
  });
}
async function countQueuedPages(jobId) {
  let n = 0;
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT count(*)::int AS n FROM crawl_pages
       WHERE job_id = $1::uuid AND state IN ('queued', 'retry', 'processing')`,
      [jobId]
    );
    n = Number(res.rows[0]?.n ?? 0);
  });
  return n;
}
async function reclaimStale(jobId) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = CASE WHEN attempts >= $2 THEN 'failed' ELSE 'retry' END,
           last_error = COALESCE(last_error, 'Stale processing reclaimed'),
           updated_at = NOW()
       WHERE job_id = $1::uuid
         AND state = 'processing'
         AND updated_at < NOW() - INTERVAL '20 seconds'`,
      [jobId, MAX_PAGE_ATTEMPTS]
    );
  });
}
async function claimPageBatch(jobId, limit) {
  let pages = [];
  await withPg(async (client) => {
    const res = await client.query(
      `UPDATE crawl_pages AS p
       SET
         state = 'processing',
         attempts = p.attempts + 1,
         updated_at = NOW()
       WHERE p.id IN (
         SELECT id
         FROM crawl_pages
         WHERE job_id = $1::uuid
           AND state IN ('queued', 'retry')
         ORDER BY created_at ASC
         LIMIT $2
       )
       AND p.state IN ('queued', 'retry')
       RETURNING p.id, p.url, p.attempts`,
      [jobId, limit]
    );
    pages = res.rows.map((r) => ({
      id: String(r.id),
      url: String(r.url),
      attempts: Number(r.attempts ?? 0)
    }));
  });
  return pages;
}
async function markPageCompleted(pageId, data) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = 'completed',
           title = $2,
           markdown = $3,
           page_type = $4,
           metadata = $5::jsonb,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [
        pageId,
        data.title,
        data.markdown,
        data.pageType,
        JSON.stringify(data.metadata)
      ]
    );
  });
}
async function markPageFailed(pageId, error, retry) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_pages
       SET state = $2,
           last_error = $3,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [pageId, retry ? "retry" : "failed", error]
    );
  });
}
async function mirrorWebsitePage(input) {
  await withPg(async (client) => {
    await client.query(
      `INSERT INTO website_pages (analysis_id, url, page_type, title, markdown, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)`,
      [
        input.analysisId,
        input.url,
        input.pageType,
        input.title,
        input.markdown,
        JSON.stringify(input.metadata)
      ]
    );
  });
}
async function updateAnalysisProgress(input) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE website_analyses
       SET status = 'running',
           stage = $2,
           progress = $3,
           pages_completed = $4,
           pages_failed = $5,
           pages_discovered = GREATEST(COALESCE(pages_discovered, 0), $6),
           scan_phase = COALESCE($7, scan_phase, 'processing'),
           scan_meta = COALESCE(scan_meta, '{}'::jsonb)
             || jsonb_build_object(
               'scanStage', 'crawling',
               'execution', 'worker',
               'currentUrl', to_jsonb($8::text),
               'lastProgressAt', to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000)::bigint)
             ),
           error = NULL
       WHERE id = $1::uuid`,
      [
        input.analysisId,
        input.stage,
        input.progress,
        input.pagesCompleted,
        input.pagesFailed,
        input.pagesDiscovered,
        input.scanPhase ?? "processing",
        input.currentUrl
      ]
    );
  });
}
async function failAnalysis(analysisId, message) {
  await withPg(async (client) => {
    await client.query(
      `UPDATE website_analyses
       SET status = 'failed',
           scan_phase = 'failed',
           stage = 'Failed',
           error = $2,
           completed_at = NOW()
       WHERE id = $1::uuid`,
      [analysisId, message]
    );
    await client.query(
      `UPDATE websites
       SET status = 'error', updated_at = NOW()
       WHERE id = (SELECT website_id FROM website_analyses WHERE id = $1::uuid)`,
      [analysisId]
    );
  });
}
async function countByState(jobId) {
  const out = {};
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT state, count(*)::int AS n
       FROM crawl_pages WHERE job_id = $1::uuid
       GROUP BY state`,
      [jobId]
    );
    for (const row of res.rows) {
      out[String(row.state)] = Number(row.n ?? 0);
    }
  });
  return out;
}
async function isAnalysisPaused(analysisId) {
  let paused = false;
  await withPg(async (client) => {
    const res = await client.query(
      `SELECT scan_phase FROM website_analyses WHERE id = $1::uuid`,
      [analysisId]
    );
    const phase = String(res.rows[0]?.scan_phase ?? "");
    paused = phase === "paused" || phase === "cancelled" || phase === "failed";
  });
  return paused;
}
async function notifyScanComplete(analysisId) {
  const secret = process.env.CRON_SECRET?.trim();
  const origin = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/$/, "");
  if (!secret || !origin) {
    console.error(
      "crawl-worker: cannot notify scan complete \u2014 set APP_URL and CRON_SECRET",
      { analysisId, hasSecret: Boolean(secret), hasOrigin: Boolean(origin) }
    );
    return;
  }
  const url = `${origin}/api/scan/complete`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-cron-secret": secret,
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify({ analysisId }),
      signal: AbortSignal.timeout(15e3)
    });
    if (!res.ok) {
      console.error("crawl-worker: scan complete HTTP", res.status, await res.text());
    } else {
      console.log("crawl-worker: post-crawl started", analysisId);
    }
  } catch (err) {
    console.error("crawl-worker: scan complete notify failed", err);
  }
}
async function processProductJob(job) {
  const analysisId = job.analysis_id;
  const concurrency = Math.min(
    8,
    Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 10))
  );
  const deadline = Date.now() + Number(process.env.CRAWL_MAX_RUNTIME_MS || 15 * 6e4);
  console.log(
    `crawl-worker: product drain ${job.id} analysis=${analysisId} concurrency=${concurrency}`
  );
  while (Date.now() < deadline) {
    if (await isAnalysisPaused(analysisId)) {
      console.log("crawl-worker: analysis paused/cancelled \u2014 releasing job", analysisId);
      await withPg(async (client) => {
        await client.query(
          `UPDATE crawl_jobs SET status = 'queued', updated_at = NOW() WHERE id = $1::uuid`,
          [job.id]
        );
      });
      return;
    }
    await reclaimStale(job.id);
    const batch = await claimPageBatch(job.id, concurrency);
    if (batch.length === 0) {
      const counts2 = await countByState(job.id);
      const remaining = (counts2.queued ?? 0) + (counts2.retry ?? 0) + (counts2.processing ?? 0);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const completed2 = counts2.completed ?? 0;
      if (completed2 === 0) {
        await failAnalysis(
          analysisId,
          "We couldn't analyze this website. Please confirm the URL is publicly accessible."
        );
        await completeJob(job.id, false, "zero completed pages", 0);
        return;
      }
      await completeJob(job.id, true, void 0, completed2);
      await updateAnalysisProgress({
        analysisId,
        stage: "Understanding business",
        progress: 32,
        pagesCompleted: completed2,
        pagesFailed: counts2.failed ?? 0,
        pagesDiscovered: completed2 + (counts2.failed ?? 0),
        currentUrl: null,
        scanPhase: "analyzing"
      });
      await notifyScanComplete(analysisId);
      return;
    }
    await Promise.all(
      batch.map(async (page) => {
        try {
          const record = await extractSinglePage(page.url, {
            playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
            timeoutMs: EXTRACT_TIMEOUT_HINT_MS
          });
          if (!record || record.markdown.trim().length < 40) {
            await markPageFailed(
              page.id,
              "thin or empty content",
              page.attempts < MAX_PAGE_ATTEMPTS
            );
            return;
          }
          const scraped = toScrapedPage({
            ...record,
            pageType: classifyPageType(record.finalUrl || record.url, job.url)
          });
          const pageType = scraped.pageType;
          await markPageCompleted(page.id, {
            title: scraped.title,
            markdown: scraped.markdown,
            pageType,
            metadata: scraped.metadata
          });
          await mirrorWebsitePage({
            analysisId,
            url: scraped.url,
            pageType,
            title: scraped.title,
            markdown: scraped.markdown,
            metadata: scraped.metadata
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await markPageFailed(
            page.id,
            msg,
            page.attempts < MAX_PAGE_ATTEMPTS
          );
        }
      })
    );
    const counts = await countByState(job.id);
    const completed = counts.completed ?? 0;
    const failed = counts.failed ?? 0;
    const discovered = completed + failed + (counts.queued ?? 0) + (counts.retry ?? 0) + (counts.processing ?? 0);
    const progress = Math.min(
      30,
      15 + Math.round(completed / Math.max(1, discovered) * 15)
    );
    await updateAnalysisProgress({
      analysisId,
      stage: `Reading page ${completed} of ${discovered}\u2026`,
      progress,
      pagesCompleted: completed,
      pagesFailed: failed,
      pagesDiscovered: discovered,
      currentUrl: batch[0]?.url ?? null,
      scanPhase: "processing"
    });
  }
  console.warn("crawl-worker: product job runtime budget hit \u2014 requeue", job.id);
  await withPg(async (client) => {
    await client.query(
      `UPDATE crawl_jobs SET status = 'queued', updated_at = NOW() WHERE id = $1::uuid`,
      [job.id]
    );
  });
}
async function processLegacyDeepJob(job) {
  console.log(`crawl-worker: legacy crawl ${job.id} ${job.url}`);
  try {
    const result = await crawlSite({
      url: job.url,
      mode: job.mode || "deep",
      maxPages: job.max_pages || 200,
      concurrency: Number(process.env.CRAWL_CONCURRENCY || 10),
      playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1",
      maxRuntimeMs: Number(process.env.CRAWL_MAX_RUNTIME_MS || 15 * 6e4),
      jobId: job.id
    });
    await withPg(async (client) => {
      for (const page of result.scraped) {
        await client.query(
          `INSERT INTO crawl_pages (job_id, url, page_type, title, markdown, metadata, state)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'completed')
           ON CONFLICT DO NOTHING`,
          [
            job.id,
            page.url,
            page.pageType,
            page.title,
            page.markdown,
            JSON.stringify(page.metadata)
          ]
        );
      }
    });
    await completeJob(
      job.id,
      result.scraped.length > 0,
      void 0,
      result.scraped.length
    );
    if (job.analysis_id && result.scraped.length > 0) {
      for (const page of result.scraped) {
        await mirrorWebsitePage({
          analysisId: job.analysis_id,
          url: page.url,
          pageType: page.pageType,
          title: page.title,
          markdown: page.markdown,
          metadata: page.metadata
        });
      }
      await notifyScanComplete(job.analysis_id);
    }
  } catch (err) {
    await completeJob(
      job.id,
      false,
      err instanceof Error ? err.message : String(err)
    );
    if (job.analysis_id) {
      await failAnalysis(
        job.analysis_id,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
async function tick() {
  const job = await claimJob();
  if (!job) return;
  if (job.analysis_id) {
    const pending = await countQueuedPages(job.id);
    if (pending > 0) {
      await processProductJob(job);
      return;
    }
    await new Promise((r) => setTimeout(r, 2e3));
    const again = await countQueuedPages(job.id);
    if (again > 0) {
      await processProductJob(job);
      return;
    }
  }
  await processLegacyDeepJob(job);
}
async function main() {
  const pollMs = Number(process.env.CRAWL_WORKER_POLL_MS || 5e3);
  console.log(`crawl-worker: started (poll ${pollMs}ms, product+legacy)`);
  for (; ; ) {
    try {
      await tick();
    } catch (err) {
      console.error("crawl-worker tick error", err);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
export {
  notifyScanComplete,
  processProductJob,
  main as runCrawlWorker
};
//# sourceMappingURL=worker.js.map