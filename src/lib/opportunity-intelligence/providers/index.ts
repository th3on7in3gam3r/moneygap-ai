import type { DemandRow, QueryRow } from "@/lib/opportunity-intelligence/types";

/** Future: Ahrefs / DataForSEO / etc. */
export interface KeywordDemandProvider {
  getDemand(terms: string[]): Promise<DemandRow[]>;
}

/** Future: Google Search Console */
export interface SearchConsoleProvider {
  getQueries(site: string): Promise<QueryRow[]>;
}

/** Phase 1 — demand proxy from local corpus frequency / position. */
export class LocalCorpusProvider implements KeywordDemandProvider {
  constructor(private readonly termFrequency: Map<string, number>) {}

  async getDemand(terms: string[]): Promise<DemandRow[]> {
    const max = Math.max(1, ...[...this.termFrequency.values()]);
    return terms.map((term) => {
      const freq = this.termFrequency.get(term.toLowerCase()) ?? 0;
      return { term, demandProxy: Math.min(1, freq / max) };
    });
  }
}

export function createLocalCorpusProvider(corpus: string): LocalCorpusProvider {
  const freq = new Map<string, number>();
  const tokens = corpus
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return new LocalCorpusProvider(freq);
}
