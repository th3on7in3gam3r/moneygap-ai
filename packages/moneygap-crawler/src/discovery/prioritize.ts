import type { PageType } from "../types/index.js";

const PAGE_TYPE_PATTERNS: { type: PageType; patterns: RegExp[] }[] = [
  { type: "about", patterns: [/\/about(?:-us)?(?:\/|$)/i, /\/company(?:\/|$)/i, /\/our-story(?:\/|$)/i] },
  { type: "services", patterns: [/\/services?(?:\/|$)/i, /\/solutions?(?:\/|$)/i, /\/what-we-do(?:\/|$)/i] },
  { type: "products", patterns: [/\/products?(?:\/|$)/i, /\/shop(?:\/|$)/i, /\/store(?:\/|$)/i, /\/catalog(?:\/|$)/i] },
  { type: "pricing", patterns: [/\/pricing(?:\/|$)/i, /\/plans?(?:\/|$)/i, /\/packages?(?:\/|$)/i] },
  { type: "blog", patterns: [/\/blog(?:\/|$)/i, /\/news(?:\/|$)/i, /\/articles?(?:\/|$)/i, /\/insights?(?:\/|$)/i] },
  { type: "contact", patterns: [/\/contact(?:-us)?(?:\/|$)/i, /\/get-in-touch(?:\/|$)/i, /\/support(?:\/|$)/i] },
  { type: "faq", patterns: [/\/faq(?:\/|$)/i, /\/help(?:\/|$)/i, /\/questions?(?:\/|$)/i] },
  {
    type: "resources",
    patterns: [/\/resources?(?:\/|$)/i, /\/guides?(?:\/|$)/i, /\/docs?(?:\/|$)/i, /\/learn(?:\/|$)/i, /\/library(?:\/|$)/i],
  },
];

const PRIORITY: Record<PageType, number> = {
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
  other: 10,
};

/** Quick-scan path keywords (homepage + key marketing pages). */
export const QUICK_TYPES: PageType[] = [
  "homepage",
  "about",
  "services",
  "products",
  "pricing",
  "contact",
];

export function classifyPageType(url: string, homepageUrl: string): PageType {
  try {
    const parsed = new URL(url);
    const home = new URL(homepageUrl);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (parsed.origin === home.origin && (path === "/" || path === "")) {
      return "homepage";
    }
  } catch {
    // fall through
  }
  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return type;
  }
  return "other";
}

export function prioritizeUrls(
  homepage: string,
  candidates: string[],
  limit: number,
  mode: "quick" | "standard" | "deep",
): string[] {
  const home = homepage.replace(/\/$/, "");
  const scored = candidates.map((url) => {
    const type = classifyPageType(url, homepage);
    return { url, type, score: PRIORITY[type] };
  });

  scored.sort((a, b) => a.score - b.score);

  if (mode === "quick") {
    const selected: string[] = [];
    const seen = new Set<PageType>();
    for (const item of scored) {
      if (!QUICK_TYPES.includes(item.type)) continue;
      if (seen.has(item.type) && item.type !== "homepage") continue;
      seen.add(item.type);
      selected.push(item.url);
      if (selected.length >= Math.min(limit, 12)) break;
    }
    if (!selected.some((u) => classifyPageType(u, homepage) === "homepage")) {
      selected.unshift(homepage);
    }
    return Array.from(new Set(selected)).slice(0, limit);
  }

  const selected: string[] = [];
  const seenTypes = new Set<PageType>();
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
