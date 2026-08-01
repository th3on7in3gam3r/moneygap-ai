import Firecrawl from "@mendable/firecrawl-js";
import type { DiscoveredCompetitor } from "@/lib/analysis/competitive/types";
import { PAGES_PER_COMPETITOR } from "@/lib/analysis/competitive/types";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error(MISSING_KEYS_ERROR);
  return new Firecrawl({ apiKey });
}

async function scrapeLimited(url: string, limit: number): Promise<string> {
  const client = getFirecrawl();
  const chunks: string[] = [];

  try {
    const home = await client.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    if (home.markdown && home.markdown.trim().length > 40) {
      chunks.push(`## HOMEPAGE\nURL: ${url}\n\n${home.markdown.slice(0, 16000)}`);
    }
  } catch {
    // continue
  }

  let mapped: string[] = [];
  try {
    const mapResult = await client.map(url, { limit: 30 });
    mapped = (mapResult.links ?? [])
      .map((l) => l.url)
      .filter((u): u is string => Boolean(u));
  } catch {
    // map optional
  }

  const priorityRe =
    /\/(about|pricing|plans|services|products|blog|resources|faq|contact)/i;
  const targets = mapped
    .filter((u) => priorityRe.test(u) && u !== url)
    .slice(0, Math.max(0, limit - 1));

  for (const target of targets) {
    if (chunks.length >= limit) break;
    try {
      const result = await client.scrape(target, {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      const md = result.markdown ?? "";
      if (md.trim().length < 40) continue;
      chunks.push(`## PAGE\nURL: ${target}\n\n${md.slice(0, 12000)}`);
    } catch {
      // skip
    }
  }

  return chunks.join("\n\n---\n\n").slice(0, 40000);
}

export async function crawlCompetitor(
  competitor: DiscoveredCompetitor,
): Promise<{ corpus: string; crawlOk: boolean }> {
  try {
    const corpus = await scrapeLimited(competitor.url, PAGES_PER_COMPETITOR);
    return { corpus, crawlOk: corpus.trim().length > 80 };
  } catch {
    return { corpus: "", crawlOk: false };
  }
}

export async function crawlCompetitorsWithConcurrency(
  competitors: DiscoveredCompetitor[],
  concurrency = 2,
): Promise<(DiscoveredCompetitor & { corpus: string; crawlOk: boolean })[]> {
  const results: (DiscoveredCompetitor & { corpus: string; crawlOk: boolean })[] =
    new Array(competitors.length);
  let next = 0;

  async function worker() {
    while (next < competitors.length) {
      const i = next++;
      const c = competitors[i]!;
      const crawled = await crawlCompetitor(c);
      results[i] = { ...c, ...crawled };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, competitors.length) }, () =>
      worker(),
    ),
  );

  return results;
}
