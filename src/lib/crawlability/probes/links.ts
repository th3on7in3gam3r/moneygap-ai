import type { PageCrawlSnapshot, RedirectHop } from "../types";

const UA =
  "Mozilla/5.0 (compatible; MoneyGapCrawlability/1.0; +https://moneygap-ai.com)";

const SOFT_404_RE =
  /\b(404|page not found|not found|doesn.?t exist|no longer available|error 404)\b/i;

function metaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractCanonical(html: string): string | null {
  return (
    html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
    )?.[1] ??
    null
  );
}

function extractHreflang(html: string): { lang: string; href: string }[] {
  const out: { lang: string; href: string }[] = [];
  const re = /<link[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/rel=["']alternate["']/i.test(tag)) continue;
    const lang = tag.match(/hreflang=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (lang && href) out.push({ lang, href });
  }
  return out;
}

function extractInternalHrefs(html: string, origin: string): string[] {
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    try {
      const abs = new URL(href, origin);
      if (abs.origin === origin) {
        abs.hash = "";
        out.push(abs.toString());
      }
    } catch {
      /* skip */
    }
  }
  return [...new Set(out)].slice(0, 80);
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
      /* ignore */
    }
  }
  return [...new Set(types)];
}

function paginationRel(html: string): { next: string | null; prev: string | null } {
  const next =
    html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']next["']/i)?.[1] ??
    null;
  const prev =
    html.match(/<link[^>]+rel=["']prev["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']prev["']/i)?.[1] ??
    null;
  return { next, prev };
}

/** Follow redirects manually to detect chains and loops. */
export async function probeRedirectChain(
  startUrl: string,
  maxHops = 8,
): Promise<{ hops: RedirectHop[]; finalUrl: string; loop: boolean; status: number | null }> {
  const hops: RedirectHop[] = [];
  const seen = new Set<string>();
  let url = startUrl;
  let finalStatus: number | null = null;

  for (let i = 0; i < maxHops; i++) {
    if (seen.has(url)) {
      return { hops, finalUrl: url, loop: true, status: finalStatus };
    }
    seen.add(url);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      finalStatus = res.status;
      const location = res.headers.get("location");
      hops.push({ url, status: res.status, location });
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url).toString();
        continue;
      }
      return { hops, finalUrl: url, loop: false, status: res.status };
    } catch {
      return { hops, finalUrl: url, loop: false, status: finalStatus };
    }
  }
  return { hops, finalUrl: url, loop: false, status: finalStatus };
}

export async function probePage(url: string): Promise<PageCrawlSnapshot> {
  const https = url.startsWith("https://");
  const chain = await probeRedirectChain(url);
  const fetchUrl = chain.finalUrl || url;

  let html = "";
  let status = chain.status;
  let xRobotsTag: string | null = null;

  // Re-fetch final URL for body + X-Robots-Tag when last hop was not already a body response
  try {
    const res = await fetch(fetchUrl, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    status = res.status;
    xRobotsTag = res.headers.get("x-robots-tag");
    html = await res.text();
    if (html.length > 400_000) html = html.slice(0, 400_000);
  } catch {
    html = "";
  }

  const origin = (() => {
    try {
      return new URL(fetchUrl).origin;
    } catch {
      return fetchUrl;
    }
  })();

  const title =
    html
      .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, "")
      .trim() ?? null;
  const textish = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
  const soft404Suspect =
    status === 200 &&
    (SOFT_404_RE.test(title ?? "") ||
      SOFT_404_RE.test(textish.slice(0, 2000)) ||
      html.length < 800);

  const scriptTags = (html.match(/<script\b/gi) ?? []).length;
  const scriptHeavy = html.length > 0 && scriptTags >= 15 && html.length < 25_000;

  const types = jsonLdTypes(html);

  return {
    url,
    finalUrl: fetchUrl,
    status,
    htmlLength: html.length,
    title,
    canonical: extractCanonical(html),
    metaRobots: metaContent(html, "robots") ?? metaContent(html, "googlebot"),
    xRobotsTag,
    hreflang: extractHreflang(html),
    hasNav: /<nav\b/i.test(html),
    hasBreadcrumbMarkup: /breadcrumb/i.test(html) || /aria-label=["']breadcrumb["']/i.test(html),
    hasBreadcrumbJsonLd: types.some((t) => /BreadcrumbList/i.test(t)),
    jsonLdTypes: types,
    internalHrefs: extractInternalHrefs(html, origin),
    soft404Suspect,
    https,
    redirectChain: chain.hops.filter((h) => h.status >= 300 && h.status < 400),
    redirectLoop: chain.loop,
    paginationRel: paginationRel(html),
    scriptHeavy,
  };
}

export async function probePages(
  urls: string[],
  concurrency = 4,
): Promise<PageCrawlSnapshot[]> {
  const unique = [...new Set(urls)].slice(0, 40);
  const results: PageCrawlSnapshot[] = new Array(unique.length);
  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const i = next;
      next += 1;
      results[i] = await probePage(unique[i]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
  );
  return results;
}

export async function probeLlmsTxt(origin: string): Promise<{ ok: boolean; status: number | null }> {
  const base = origin.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/llms.txt`, {
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    const body = await res.text();
    return { ok: res.ok && body.trim().length > 20, status: res.status };
  } catch {
    return { ok: false, status: null };
  }
}
