import type { PageType } from "@/lib/analysis/stages";

export type CorpusPage = {
  url: string;
  pageType: PageType | string;
  title: string | null;
  markdown: string;
  metadata?: Record<string, unknown>;
};

/** Priority for compact site intelligence (higher first). */
const PAGE_TYPE_PRIORITY: Record<string, number> = {
  homepage: 100,
  pricing: 95,
  products: 90,
  services: 90,
  about: 80,
  contact: 75,
  faq: 70,
  nav: 60,
  resources: 50,
  blog: 40,
  other: 20,
};

export const INTELLIGENCE_CORPUS_BUDGET = {
  /** Soft max characters for the final website-intelligence LLM call. */
  maxChars: 48_000,
  /** Soft max estimated tokens (~4 chars/token). */
  maxEstimatedTokens: 12_000,
  /** Per-page markdown cap after prioritization. */
  perPageChars: 2_400,
  /** Max distinct pages included in the compacted corpus. */
  maxPages: 24,
} as const;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function dedupePagesByUrl<T extends { url: string; markdown?: string }>(
  pages: T[],
): T[] {
  const best = new Map<string, T>();
  for (const page of pages) {
    const key = normalizeUrlKey(page.url);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, page);
      continue;
    }
    const prevLen = (prev.markdown ?? "").length;
    const nextLen = (page.markdown ?? "").length;
    if (nextLen > prevLen) best.set(key, page);
  }
  return [...best.values()];
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function pagePriority(page: CorpusPage): number {
  const typeScore = PAGE_TYPE_PRIORITY[page.pageType] ?? 20;
  const lenBonus = Math.min(10, Math.floor((page.markdown?.length ?? 0) / 2000));
  return typeScore + lenBonus;
}

/**
 * Build a compact, prioritized corpus for LLM analysis.
 * Never dumps dozens of full pages into one request.
 */
export function buildCompactIntelligenceCorpus(
  pages: CorpusPage[],
  budget = INTELLIGENCE_CORPUS_BUDGET,
): {
  corpus: string;
  pageCount: number;
  inputChars: number;
  estimatedTokens: number;
  truncated: boolean;
  droppedPages: number;
  prioritizedTypes: string[];
} {
  const deduped = dedupePagesByUrl(pages);
  const ranked = [...deduped].sort((a, b) => pagePriority(b) - pagePriority(a));
  const selected = ranked.slice(0, budget.maxPages);

  const parts: string[] = [];
  let used = 0;
  const types: string[] = [];
  let truncated = selected.length < ranked.length;

  for (const page of selected) {
    const body = (page.markdown ?? "").slice(0, budget.perPageChars);
    const block = `## [${String(page.pageType).toUpperCase()}] ${page.title ?? page.url}\nURL: ${page.url}\n\n${body}`;
    if (used + block.length + 8 > budget.maxChars) {
      truncated = true;
      break;
    }
    parts.push(block);
    types.push(String(page.pageType));
    used += block.length + 8;
  }

  const corpus = parts.join("\n\n---\n\n");
  return {
    corpus,
    pageCount: parts.length,
    inputChars: corpus.length,
    estimatedTokens: estimateTokenCount(corpus),
    truncated,
    droppedPages: Math.max(0, deduped.length - parts.length),
    prioritizedTypes: [...new Set(types)],
  };
}

/** Compact page-level signals for hierarchical aggregation (no full markdown). */
export function extractPageSignals(page: CorpusPage): {
  pageType: string;
  title: string | null;
  url: string;
  summary: string;
  keywords: string[];
  signals: string[];
} {
  const text = (page.markdown ?? "").replace(/\s+/g, " ").trim();
  const summary = text.slice(0, 280);
  const keywords = Array.from(
    new Set(
      (text.toLowerCase().match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? [])
        .filter((w) => !STOP.has(w))
        .slice(0, 12),
    ),
  );
  const signals: string[] = [];
  const lower = text.toLowerCase();
  if (/pric|plan|\$|subscribe|buy now/.test(lower)) signals.push("pricing");
  if (/testimonial|review|case study|clients? say/.test(lower)) signals.push("trust");
  if (/contact|book a call|get started|demo/.test(lower)) signals.push("conversion");
  if (/service|product|solution|offer/.test(lower)) signals.push("offer");
  return {
    pageType: String(page.pageType),
    title: page.title,
    url: page.url,
    summary,
    keywords,
    signals,
  };
}

const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "your",
  "have",
  "will",
  "they",
  "them",
  "were",
  "been",
  "also",
  "into",
  "about",
  "there",
  "their",
  "which",
  "would",
  "could",
  "should",
  "more",
  "than",
  "when",
  "what",
  "page",
  "https",
  "http",
]);

export function buildSiteIntelligenceModel(pages: CorpusPage[]): string {
  const deduped = dedupePagesByUrl(pages);
  const ranked = [...deduped]
    .sort((a, b) => pagePriority(b) - pagePriority(a))
    .slice(0, INTELLIGENCE_CORPUS_BUDGET.maxPages);
  const model = {
    pageCount: deduped.length,
    pages: ranked.map(extractPageSignals),
  };
  return JSON.stringify(model);
}
