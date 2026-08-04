import type { KnowledgeResource } from "../types";

const KIND_PATTERNS: { kind: KnowledgeResource["kind"]; re: RegExp }[] = [
  { kind: "docs", re: /\/(docs|documentation|developers?|api)(\/|$)/i },
  { kind: "help", re: /\/(help|support|kb|knowledge)(\/|$)/i },
  { kind: "faq", re: /\/(faq|faqs|questions)(\/|$)/i },
  { kind: "blog", re: /\/(blog|articles?|news|academy|learn)(\/|$)/i },
  { kind: "support", re: /\/(contact|support|tickets?)(\/|$)/i },
];

/**
 * Detect knowledge-oriented URLs from a crawl / route list.
 */
export function detectKnowledgeResources(
  urls: string[],
): KnowledgeResource[] {
  const out: KnowledgeResource[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    let url: string;
    try {
      url = new URL(raw, "https://example.com").pathname + (raw.includes("://") ? "" : "");
      // Prefer absolute when provided
      url = raw.startsWith("http") ? raw.split("#")[0]! : raw;
    } catch {
      continue;
    }
    const key = url.toLowerCase();
    if (seen.has(key)) continue;

    let kind: KnowledgeResource["kind"] = "other";
    for (const p of KIND_PATTERNS) {
      if (p.re.test(url)) {
        kind = p.kind;
        break;
      }
    }
    if (kind === "other" && !/\/(docs|help|faq|blog|support|contact)/i.test(url)) {
      continue;
    }
    seen.add(key);
    out.push({ kind, url });
  }

  return out.slice(0, 40);
}
