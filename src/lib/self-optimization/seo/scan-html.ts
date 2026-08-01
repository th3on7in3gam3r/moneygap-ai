import type { PageSeoSnapshot } from "../types";

function metaContent(html: string, nameOrProp: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameOrProp}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function collectMetaPrefix(html: string, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const prop =
      tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!prop.startsWith(prefix)) continue;
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) out[prop] = content;
  }
  return out;
}

function headings(html: string, tag: "h1" | "h2"): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) out.push(text.slice(0, 200));
  }
  return out;
}

function jsonLdTypes(html: string): string[] {
  const types: string[] = [];
  const re =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]) as unknown;
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") types.push(t);
        if (Array.isArray(t)) {
          for (const x of t) if (typeof x === "string") types.push(x);
        }
        if (obj["@graph"]) walk(obj["@graph"]);
      };
      walk(data);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return [...new Set(types)];
}

function countLinks(html: string, origin: string): { internal: number; external: number } {
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let internal = 0;
  let external = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const abs = new URL(href, origin);
      if (abs.origin === origin) internal += 1;
      else external += 1;
    } catch {
      /* skip */
    }
  }
  return { internal, external };
}

function imageAltStats(html: string): { total: number; missingAlt: number } {
  const re = /<img\b[^>]*>/gi;
  let total = 0;
  let missingAlt = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    total += 1;
    const tag = m[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (!alt || !alt[1].trim()) missingAlt += 1;
  }
  return { total, missingAlt };
}

const PAGE_FETCH_TIMEOUT_MS = 8_000;
/** Keep modest — local self-scans hit the same Next server that is running the job. */
const PAGE_FETCH_CONCURRENCY = 4;

export async function fetchPageSeo(
  url: string,
): Promise<PageSeoSnapshot> {
  const started = Date.now();
  let status: number | null = null;
  let html = "";
  let ttfbMs: number | null = null;

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "MoneyGapSelfOptimization/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
      // Avoid hanging on slow/chunked SSR bodies during local self-scans.
      cache: "no-store",
    });
    ttfbMs = Date.now() - started;
    status = res.status;
    // Cap HTML parse work — SEO heuristics only need the head + early body.
    const raw = await res.text();
    html = raw.length > 400_000 ? raw.slice(0, 400_000) : raw;
  } catch {
    return {
      url,
      status: null,
      title: null,
      metaDescription: null,
      canonical: null,
      og: {},
      twitter: {},
      h1: [],
      h2: [],
      imagesMissingAlt: 0,
      imageCount: 0,
      internalLinks: 0,
      externalLinks: 0,
      jsonLdTypes: [],
      hasMain: false,
      hasNav: false,
      hasFooter: false,
      htmlLength: 0,
      ttfbMs: null,
    };
  }

  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  })();

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .trim() ?? null;
  const imgs = imageAltStats(html);
  const links = countLinks(html, origin);

  return {
    url,
    status,
    title,
    metaDescription: metaContent(html, "description"),
    canonical:
      html.match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      )?.[1] ??
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
      )?.[1] ??
      null,
    og: collectMetaPrefix(html, "og:"),
    twitter: collectMetaPrefix(html, "twitter:"),
    h1: headings(html, "h1"),
    h2: headings(html, "h2"),
    imagesMissingAlt: imgs.missingAlt,
    imageCount: imgs.total,
    internalLinks: links.internal,
    externalLinks: links.external,
    jsonLdTypes: jsonLdTypes(html),
    hasMain: /<main\b/i.test(html),
    hasNav: /<nav\b/i.test(html),
    hasFooter: /<footer\b/i.test(html),
    htmlLength: html.length,
    ttfbMs,
  };
}

export async function fetchPages(
  origin: string,
  paths: string[],
): Promise<PageSeoSnapshot[]> {
  const urls = paths.map((p) => {
    if (p.startsWith("http")) return p;
    return `${origin.replace(/\/$/, "")}${p.startsWith("/") ? p : `/${p}`}`;
  });
  const unique = [...new Set(urls)];
  const results: PageSeoSnapshot[] = new Array(unique.length);
  let next = 0;

  async function worker() {
    while (next < unique.length) {
      const i = next;
      next += 1;
      results[i] = await fetchPageSeo(unique[i]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(PAGE_FETCH_CONCURRENCY, unique.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
