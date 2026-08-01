import { buildRssXml, isGrowthAcademyEnabled, listPublishedArticles } from "@/lib/growth-academy";

export async function GET() {
  if (!isGrowthAcademyEnabled()) {
    return new Response("Not found", { status: 404 });
  }
  const articles = await listPublishedArticles({ limit: 40 });
  // Prefer chronological for RSS
  const sorted = [...articles].sort((a, b) => {
    const ta = a.publishedAt?.getTime() ?? 0;
    const tb = b.publishedAt?.getTime() ?? 0;
    return tb - ta;
  });
  const xml = buildRssXml(sorted);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate",
    },
  });
}
