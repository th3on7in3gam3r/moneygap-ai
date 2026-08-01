import type { MetadataRoute } from "next";
import { SITE_ORIGIN, listPublishedArticles } from "@/lib/growth-academy";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_ORIGIN}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_ORIGIN}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_ORIGIN}/academy`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_ORIGIN}/blog`, changeFrequency: "daily", priority: 0.7 },
  ];

  try {
    const articles = await listPublishedArticles({ limit: 200 });
    const articleRoutes = articles.map((a) => ({
      url: `${SITE_ORIGIN}/academy/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return [...staticRoutes, ...articleRoutes];
  } catch {
    return staticRoutes;
  }
}
