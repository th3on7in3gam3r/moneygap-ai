import type {
  KeywordCluster,
  KeywordKind,
  SearchIntentKind,
} from "@/lib/opportunity-intelligence/types";
import { classifySearchIntent } from "@/lib/opportunity-intelligence/search-intent/classify";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function extractPhrases(text: string): string[] {
  const lines = text.split(/\n+/);
  const phrases: string[] = [];
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading?.[1]) phrases.push(heading[1].trim());
    const titleish = line.match(/^(.{12,80})$/);
    if (titleish && !line.includes("http") && line.split(" ").length <= 12) {
      phrases.push(line.trim());
    }
  }
  return phrases;
}

function classifyKeywordKind(
  term: string,
  intent: SearchIntentKind,
  brandHint?: string,
): KeywordKind {
  const t = term.toLowerCase();
  if (brandHint && t.includes(brandHint.toLowerCase())) return "branded";
  if (t.includes(" vs ") || t.includes("versus") || t.includes("alternative"))
    return "comparison";
  if (t.startsWith("how ") || t.startsWith("what ") || t.includes("?"))
    return "question";
  if (intent === "transactional") return "transactional";
  if (intent === "commercial") return "commercial";
  if (intent === "local") return "local";
  if (intent === "ai_assistant") return "ai_search";
  if (intent === "informational" || intent === "educational") return "informational";
  if (term.split(/\s+/).length >= 4) return "long_tail";
  return "secondary";
}

export function buildKeywordClusters(input: {
  corpus: string;
  pageTitles: string[];
  products: string[];
  services: string[];
  contentCategories: string[];
  seoOpportunities: string[];
  brandHint?: string;
}): KeywordCluster[] {
  const seeds = [
    ...input.pageTitles,
    ...input.products,
    ...input.services,
    ...input.contentCategories,
    ...input.seoOpportunities,
    ...extractPhrases(input.corpus).slice(0, 40),
  ]
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 80);

  const unique = [...new Map(seeds.map((s) => [s.toLowerCase(), s])).values()];
  const clusters: KeywordCluster[] = [];

  for (const primary of unique.slice(0, 24)) {
    const intent = classifySearchIntent(primary);
    const related = unique
      .filter((u) => u !== primary && u.toLowerCase().includes(primary.toLowerCase().split(/\s+/)[0]!))
      .slice(0, 6);
    const keywords = [
      {
        term: primary,
        kind: "primary" as KeywordKind,
        intent,
      },
      ...related.map((term) => {
        const i = classifySearchIntent(term);
        return {
          term,
          kind: classifyKeywordKind(term, i, input.brandHint),
          intent: i,
        };
      }),
    ];
    const demandProxy = Math.min(1, 0.35 + keywords.length * 0.08);
    clusters.push({
      id: `kw-${slugify(primary)}`,
      label: primary,
      primary,
      keywords,
      intent,
      demandProxy,
    });
  }

  return clusters;
}
