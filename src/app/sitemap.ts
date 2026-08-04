import type { MetadataRoute } from "next";
import {
  listAuthors,
  listCategories,
  listPublishedArticles,
} from "@/lib/growth-academy";
import { listPublicDocs } from "@/lib/docs";
import {
  frameworksWithPublished,
  listPublishedGuides,
} from "@/lib/guides";
import { db } from "@/db";
import { gaTags } from "@/db/schema";
import { absoluteUrl } from "@/lib/seo";

const STATIC_PATHS: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/features", changeFrequency: "monthly", priority: 0.85 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  { path: "/guides/search", changeFrequency: "weekly", priority: 0.5 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/security", changeFrequency: "yearly", priority: 0.45 },
  { path: "/academy", changeFrequency: "daily", priority: 0.9 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
  { path: "/extension", changeFrequency: "weekly", priority: 0.75 },
  { path: "/marketplace", changeFrequency: "monthly", priority: 0.6 },
  { path: "/integrations", changeFrequency: "monthly", priority: 0.6 },
  { path: "/api", changeFrequency: "monthly", priority: 0.55 },
  { path: "/academy/rss.xml", changeFrequency: "daily", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((r) => ({
    url: absoluteUrl(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const docRoutes: MetadataRoute.Sitemap = listPublicDocs().map((d) => ({
    url: absoluteUrl(`/docs/${d.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  const publishedGuides = await listPublishedGuides();
  const withGuides = frameworksWithPublished(publishedGuides);
  const guideFrameworkRoutes: MetadataRoute.Sitemap = withGuides.map((f) => ({
    url: absoluteUrl(`/guides/${f.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const guideTopicRoutes: MetadataRoute.Sitemap = publishedGuides.map((g) => ({
    url: absoluteUrl(`/guides/${g.frameworkId}/${g.topicId}`),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  try {
    const [articles, categories, authors, tags] = await Promise.all([
      listPublishedArticles({ limit: 500 }),
      listCategories(),
      listAuthors(),
      db.select().from(gaTags).limit(200),
    ]);

    const articleRoutes = articles.map((a) => ({
      url: absoluteUrl(`/academy/${a.slug}`),
      lastModified: a.updatedAt ?? a.publishedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const categoryRoutes = categories.map((c) => ({
      url: absoluteUrl(`/academy/c/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

    const authorRoutes = authors.map((a) => ({
      url: absoluteUrl(`/academy/author/${a.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    const tagRoutes = tags.map((t) => ({
      url: absoluteUrl(`/academy/tag/${t.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.45,
    }));

    return [
      ...staticRoutes,
      ...docRoutes,
      ...guideFrameworkRoutes,
      ...guideTopicRoutes,
      ...categoryRoutes,
      ...authorRoutes,
      ...tagRoutes,
      ...articleRoutes,
    ];
  } catch {
    return [
      ...staticRoutes,
      ...docRoutes,
      ...guideFrameworkRoutes,
      ...guideTopicRoutes,
    ];
  }
}
