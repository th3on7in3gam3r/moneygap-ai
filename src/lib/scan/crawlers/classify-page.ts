import type { PageType } from "@/lib/analysis/stages";

const PAGE_TYPE_PATTERNS: { type: PageType; patterns: RegExp[] }[] = [
  { type: "about", patterns: [/\/about(?:-us)?(?:\/|$)/i, /\/company(?:\/|$)/i] },
  { type: "services", patterns: [/\/services?(?:\/|$)/i, /\/solutions?(?:\/|$)/i] },
  { type: "products", patterns: [/\/products?(?:\/|$)/i, /\/shop(?:\/|$)/i, /\/store(?:\/|$)/i] },
  { type: "pricing", patterns: [/\/pricing(?:\/|$)/i, /\/plans?(?:\/|$)/i] },
  { type: "blog", patterns: [/\/blog(?:\/|$)/i, /\/news(?:\/|$)/i, /\/articles?(?:\/|$)/i] },
  { type: "contact", patterns: [/\/contact(?:-us)?(?:\/|$)/i, /\/support(?:\/|$)/i] },
  { type: "faq", patterns: [/\/faq(?:\/|$)/i, /\/help(?:\/|$)/i] },
  { type: "resources", patterns: [/\/resources?(?:\/|$)/i, /\/docs?(?:\/|$)/i, /\/guides?(?:\/|$)/i] },
];

/** Local classifier so crawler adapters do not hard-require moneygap-crawler at test load. */
export function classifyCrawlPageType(url: string, homepageUrl: string): PageType {
  try {
    const parsed = new URL(url);
    const home = new URL(homepageUrl);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    if (parsed.origin === home.origin && (path === "/" || path === "")) return "homepage";
  } catch {
    // ignore
  }
  for (const { type, patterns } of PAGE_TYPE_PATTERNS) {
    if (patterns.some((re) => re.test(url))) return type;
  }
  return "other";
}
