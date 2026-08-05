// src/fetch.ts
var DEFAULT_UA = "MoneyGapDiagnostics/0.1 (+https://moneygap-ai.com; sandbox+cli)";
async function fetchText(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": opts.userAgent ?? DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > opts.maxBytes) {
      return {
        ok: false,
        error: `Response too large (over ${Math.round(opts.maxBytes / 1024)}KB).`,
        statusCode: res.status
      };
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return {
      ok: true,
      text,
      statusCode: res.status,
      finalUrl: res.url || url
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "Request timed out." : "Could not fetch this URL."
    };
  } finally {
    clearTimeout(timer);
  }
}
async function fetchPage(url, opts) {
  const result = await fetchText(url, {
    timeoutMs: opts.timeoutMs,
    maxBytes: opts.maxHtmlBytes,
    userAgent: opts.userAgent
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      findings: [
        {
          id: "fetch.unreachable",
          category: "fetch",
          severity: "fail",
          title: "Page could not be fetched",
          detail: result.error
        }
      ]
    };
  }
  if (result.statusCode >= 400) {
    return {
      ok: false,
      error: `HTTP ${result.statusCode}`,
      findings: [
        {
          id: "fetch.http_error",
          category: "fetch",
          severity: "fail",
          title: `HTTP ${result.statusCode} response`,
          detail: `The site returned status ${result.statusCode}. Public pages should respond with 2xx or 3xx.`
        }
      ]
    };
  }
  return {
    ok: true,
    page: {
      finalUrl: result.finalUrl,
      statusCode: result.statusCode,
      html: result.text,
      bytes: Buffer.byteLength(result.text, "utf8"),
      contentType: null
    }
  };
}

// src/crawlability.ts
function parseRobots(robotsTxt) {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  let disallowAll = false;
  let hasDisallow = false;
  const sitemapUrls = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("sitemap:")) {
      const u = line.slice(line.indexOf(":") + 1).trim();
      if (u) sitemapUrls.push(u);
      continue;
    }
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim().toLowerCase();
      inStar = agent === "*";
      continue;
    }
    if (!inStar) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim();
      hasDisallow = true;
      if (path === "/" || path === "/*") disallowAll = true;
    }
  }
  return { sitemapUrls, disallowAll, hasDisallow };
}
async function checkCrawlability(origin, opts) {
  const findings = [];
  const robotsUrl = new URL("/robots.txt", origin).href;
  const robots = await fetchText(robotsUrl, {
    timeoutMs: Math.min(opts.timeoutMs, 8e3),
    maxBytes: 256e3,
    userAgent: opts.userAgent
  });
  let sitemapCandidates = [];
  if (!robots.ok || robots.statusCode >= 400) {
    findings.push({
      id: "crawl.robots_missing",
      category: "crawlability",
      severity: "warn",
      title: "robots.txt not found",
      detail: "No reachable robots.txt. Search engines may still crawl, but crawl rules and sitemap hints are missing."
    });
  } else {
    findings.push({
      id: "crawl.robots_ok",
      category: "crawlability",
      severity: "pass",
      title: "robots.txt is reachable",
      detail: `Fetched ${robotsUrl} (HTTP ${robots.statusCode}).`
    });
    const parsed = parseRobots(robots.text);
    sitemapCandidates = parsed.sitemapUrls;
    if (parsed.disallowAll) {
      findings.push({
        id: "crawl.robots_block_all",
        category: "crawlability",
        severity: "fail",
        title: "robots.txt blocks all crawlers",
        detail: "User-agent * Disallow: / will prevent most search crawlers from indexing the site."
      });
    } else if (parsed.hasDisallow) {
      findings.push({
        id: "crawl.robots_partial",
        category: "crawlability",
        severity: "info",
        title: "robots.txt has crawl rules",
        detail: "Disallow rules found for User-agent *. Review them if important pages are blocked."
      });
    }
  }
  if (sitemapCandidates.length === 0) {
    sitemapCandidates = [
      new URL("/sitemap.xml", origin).href,
      new URL("/sitemap_index.xml", origin).href
    ];
  }
  let sitemapOk = false;
  for (const sm of sitemapCandidates.slice(0, 4)) {
    const res = await fetchText(sm, {
      timeoutMs: Math.min(opts.timeoutMs, 8e3),
      maxBytes: 512e3,
      userAgent: opts.userAgent
    });
    if (res.ok && res.statusCode < 400) {
      const looksLikeXml = /<\?xml/i.test(res.text) || /<urlset[\s>]/i.test(res.text) || /<sitemapindex[\s>]/i.test(res.text);
      if (looksLikeXml) {
        sitemapOk = true;
        findings.push({
          id: "crawl.sitemap_ok",
          category: "crawlability",
          severity: "pass",
          title: "Sitemap is reachable",
          detail: `Found a sitemap at ${sm}.`
        });
        break;
      }
    }
  }
  if (!sitemapOk) {
    findings.push({
      id: "crawl.sitemap_missing",
      category: "crawlability",
      severity: "warn",
      title: "Sitemap not found",
      detail: "No reachable XML sitemap. Adding sitemap.xml helps discovery of important URLs."
    });
  }
  return findings;
}

// src/performance.ts
function checkPerfHeuristics(html) {
  const findings = [];
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  if (imgTags.length === 0) {
    findings.push({
      id: "perf.no_images",
      category: "performance",
      severity: "info",
      title: "No <img> tags on this page",
      detail: "Performance image checks skipped for this HTML snapshot."
    });
  } else {
    let missingDims = 0;
    let missingLazy = 0;
    for (const tag of imgTags) {
      const hasWidth = /\bwidth\s*=/i.test(tag);
      const hasHeight = /\bheight\s*=/i.test(tag);
      if (!hasWidth || !hasHeight) missingDims += 1;
      const loading = tag.match(/\bloading\s*=\s*["']?([^"'>\s]+)/i)?.[1];
      if (!loading || loading.toLowerCase() !== "lazy") {
        missingLazy += 1;
      }
    }
    if (missingDims > 0) {
      findings.push({
        id: "perf.img_dimensions",
        category: "performance",
        severity: missingDims >= 3 ? "warn" : "info",
        title: "Images missing width/height",
        detail: `${missingDims}/${imgTags.length} images lack explicit dimensions \u2014 a common CLS risk signal.`
      });
    } else {
      findings.push({
        id: "perf.img_dimensions_ok",
        category: "performance",
        severity: "pass",
        title: "Image dimensions present",
        detail: "Sampled images include width/height attributes."
      });
    }
    if (imgTags.length >= 4 && missingLazy === imgTags.length) {
      findings.push({
        id: "perf.lazy_load",
        category: "performance",
        severity: "info",
        title: "Consider lazy-loading below-the-fold images",
        detail: 'No loading="lazy" attributes found on images.'
      });
    }
  }
  const hasGoogleFonts = /fonts\.googleapis\.com/i.test(html) || /fonts\.gstatic\.com/i.test(html);
  if (hasGoogleFonts) {
    const preconnect = /rel\s*=\s*["']preconnect["'][^>]*fonts\.g/i.test(html) || /fonts\.g[^>]*rel\s*=\s*["']preconnect["']/i.test(html);
    findings.push({
      id: preconnect ? "perf.fonts_preconnect_ok" : "perf.fonts_render_blocking",
      category: "performance",
      severity: preconnect ? "pass" : "warn",
      title: preconnect ? "Font preconnect detected" : "Google Fonts without preconnect",
      detail: preconnect ? "Preconnect hints found for font hosts." : "Google Fonts can delay text rendering. Add preconnect and consider font-display: swap."
    });
  } else {
    findings.push({
      id: "perf.fonts_ok",
      category: "performance",
      severity: "pass",
      title: "No obvious render-blocking Google Fonts",
      detail: "This is a heuristic signal \u2014 not a lab Web Vitals measurement."
    });
  }
  const nextImage = /_next\/image/i.test(html) || /next\/image/i.test(html);
  if (nextImage) {
    findings.push({
      id: "perf.next_image",
      category: "performance",
      severity: "pass",
      title: "Next.js image optimization hints",
      detail: "Detected next/image usage patterns in HTML."
    });
  }
  findings.push({
    id: "perf.disclaimer",
    category: "performance",
    severity: "info",
    title: "Performance signals only",
    detail: "These are HTML heuristics, not measured Core Web Vitals (LCP/INP/CLS). Run a full MoneyGap AI scan for deeper scoring."
  });
  return findings;
}
function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim() || null;
}

// src/schema.ts
function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const body = match[1]?.trim();
    if (body) blocks.push(body);
  }
  return blocks;
}
function collectTypes(node, into) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, into);
    return;
  }
  const obj = node;
  const t = obj["@type"];
  if (typeof t === "string") into.add(t);
  else if (Array.isArray(t)) {
    for (const x of t) if (typeof x === "string") into.add(x);
  }
  if (obj["@graph"]) collectTypes(obj["@graph"], into);
}
function checkSchema(html) {
  const findings = [];
  const blocks = extractJsonLdBlocks(html);
  const schemaTypes = /* @__PURE__ */ new Set();
  let validCount = 0;
  let invalidCount = 0;
  if (blocks.length === 0) {
    findings.push({
      id: "schema.missing",
      category: "schema",
      severity: "warn",
      title: "No JSON-LD structured data",
      detail: "No application/ld+json blocks found. Schema helps AI/search understand Organization, FAQ, Product, and more."
    });
    return { findings, schemaTypes: [], hasJsonLd: false };
  }
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block);
      validCount += 1;
      collectTypes(parsed, schemaTypes);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        if (!root || typeof root !== "object") continue;
        const obj = root;
        const ctx = obj["@context"];
        const hasContext = typeof ctx === "string" || typeof ctx === "object" && ctx !== null || Array.isArray(ctx);
        if (!hasContext && !obj["@graph"]) {
          findings.push({
            id: "schema.missing_context",
            category: "schema",
            severity: "warn",
            title: "JSON-LD missing @context",
            detail: "A JSON-LD block is valid JSON but lacks @context. Prefer https://schema.org."
          });
        }
      }
    } catch {
      invalidCount += 1;
    }
  }
  if (invalidCount > 0) {
    findings.push({
      id: "schema.invalid_json",
      category: "schema",
      severity: "fail",
      title: "Invalid JSON-LD",
      detail: `${invalidCount} JSON-LD script(s) failed to parse as JSON.`
    });
  }
  if (validCount > 0) {
    const types = [...schemaTypes];
    findings.push({
      id: "schema.present",
      category: "schema",
      severity: "pass",
      title: "Structured data detected",
      detail: types.length > 0 ? `Found valid JSON-LD with types: ${types.slice(0, 8).join(", ")}${types.length > 8 ? "\u2026" : ""}.` : `Found ${validCount} valid JSON-LD block(s).`
    });
    const useful = ["Organization", "WebSite", "FAQPage", "Product", "BreadcrumbList", "LocalBusiness"];
    const hasUseful = useful.some((t) => schemaTypes.has(t));
    if (!hasUseful) {
      findings.push({
        id: "schema.weak_types",
        category: "schema",
        severity: "info",
        title: "Consider richer schema types",
        detail: "Add Organization, WebSite, FAQPage, or BreadcrumbList where relevant to improve AI/search visibility."
      });
    }
  }
  return {
    findings,
    schemaTypes: [...schemaTypes],
    hasJsonLd: validCount > 0
  };
}

// src/score.ts
function scoreFindings(findings) {
  let score = 100;
  for (const f of findings) {
    if (f.id === "perf.disclaimer") continue;
    switch (f.severity) {
      case "fail":
        score -= 18;
        break;
      case "warn":
        score -= 8;
        break;
      case "info":
        score -= 2;
        break;
      case "pass":
        break;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
function hasCriticalFailures(findings) {
  return findings.some((f) => f.severity === "fail");
}

// src/url.ts
var PRIVATE_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
function isPrivateHostname(hostname) {
  const h = hostname.replace(/\.$/, "").toLowerCase();
  if (PRIVATE_HOSTS.has(h)) return true;
  const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}
function normalizePublicUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a website URL to scan." };
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid URL, for example https://example.com." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }
  if (parsed.protocol === "http:") {
    parsed.protocol = "https:";
  }
  const hostname = parsed.hostname.replace(/\.$/, "").toLowerCase();
  if (!hostname || !hostname.includes(".")) {
    return { ok: false, error: "Enter a public domain, for example https://example.com." };
  }
  if (isPrivateHostname(hostname)) {
    return {
      ok: false,
      error: "Private or local addresses cannot be scanned. Use a public website URL."
    };
  }
  parsed.hash = "";
  const href = parsed.pathname === "/" ? parsed.origin : `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  return { ok: true, href, origin: parsed.origin, hostname };
}

// src/types.ts
var SANDBOX_STORAGE_KEY = "mg_sandbox";

// src/index.ts
var DEFAULT_TIMEOUT = 15e3;
var DEFAULT_MAX_HTML = 15e5;
function stage(id, label, status) {
  return { id, label, status };
}
async function fetchWithCrawler(href, opts) {
  try {
    const { loadPageHtml } = await import("moneygap-crawler");
    const loaded = await loadPageHtml(href, {
      timeoutMs: opts.timeoutMs,
      maxBytes: opts.maxHtmlBytes,
      userAgent: opts.userAgent,
      playwrightEnabled: process.env.PLAYWRIGHT_ENABLED === "1"
    });
    if (loaded && loaded.html.length > 0) {
      return {
        ok: true,
        page: {
          finalUrl: loaded.finalUrl,
          statusCode: loaded.statusCode,
          html: loaded.html,
          bytes: Buffer.byteLength(loaded.html, "utf8"),
          contentType: "text/html"
        }
      };
    }
  } catch {
  }
  return fetchPage(href, opts);
}
async function runLiveDiagnostics(inputUrl, options = {}) {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML;
  const onStage = options.onStage;
  const normalized = normalizePublicUrl(inputUrl);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }
  const stages = [
    stage("fetching", "Fetching page", "pending"),
    stage("crawlability", "Checking crawlability", "pending"),
    stage("schema", "Validating schema", "pending"),
    stage("performance", "Performance signals", "pending"),
    stage("scoring", "Scoring", "pending")
  ];
  const emit = (id, status) => {
    const s = stages.find((x) => x.id === id);
    if (!s) return;
    s.status = status;
    onStage?.({ ...s });
  };
  emit("fetching", "running");
  const pageRes = await fetchWithCrawler(normalized.href, {
    timeoutMs,
    maxHtmlBytes,
    userAgent: options.userAgent
  });
  if (!pageRes.ok) {
    emit("fetching", "error");
    const result2 = {
      url: normalized.href,
      finalUrl: normalized.href,
      score: 0,
      findings: pageRes.findings,
      stages,
      durationMs: Date.now() - started,
      meta: {
        title: null,
        statusCode: 0,
        htmlBytes: 0,
        hasJsonLd: false,
        schemaTypes: []
      }
    };
    return { ok: false, error: pageRes.error, result: result2 };
  }
  emit("fetching", "done");
  const { page } = pageRes;
  emit("crawlability", "running");
  const crawlFindings = await checkCrawlability(normalized.origin, {
    timeoutMs,
    userAgent: options.userAgent
  });
  emit("crawlability", "done");
  emit("schema", "running");
  const schema = checkSchema(page.html);
  emit("schema", "done");
  emit("performance", "running");
  const perfFindings = checkPerfHeuristics(page.html);
  emit("performance", "done");
  emit("scoring", "running");
  const findings = [...crawlFindings, ...schema.findings, ...perfFindings];
  const score = scoreFindings(findings);
  emit("scoring", "done");
  const result = {
    url: normalized.href,
    finalUrl: page.finalUrl,
    score,
    findings,
    stages,
    durationMs: Date.now() - started,
    meta: {
      title: extractTitle(page.html),
      statusCode: page.statusCode,
      htmlBytes: page.bytes,
      hasJsonLd: schema.hasJsonLd,
      schemaTypes: schema.schemaTypes
    }
  };
  return { ok: true, result };
}
export {
  SANDBOX_STORAGE_KEY,
  hasCriticalFailures,
  isPrivateHostname,
  normalizePublicUrl,
  runLiveDiagnostics,
  scoreFindings
};
