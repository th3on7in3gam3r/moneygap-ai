import type { Metadata } from "next";
import type { GaArticle, GaAuthor, GaFaqItem } from "@/db/schema";
import { absoluteUrl, getSiteOrigin } from "@/lib/seo/site";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo/jsonld";

export function articleCanonical(article: GaArticle): string {
  if (article.canonicalUrl?.trim()) return article.canonicalUrl.trim();
  return absoluteUrl(`/academy/${article.slug}`);
}

export function articleMetadata(
  article: GaArticle,
  author?: GaAuthor | null,
): Metadata {
  const title = article.seoTitle || article.title;
  const description =
    article.seoDescription ||
    article.excerpt ||
    "Growth Academy™ by MoneyGap AI";
  const url = articleCanonical(article);
  const image = article.ogImage || article.featuredImageUrl || undefined;
  const origin = getSiteOrigin();

  return {
    title,
    description,
    metadataBase: new URL(origin),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "MoneyGap AI",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    authors: author ? [{ name: author.name }] : undefined,
  };
}

export function articleJsonLd(input: {
  article: GaArticle;
  author?: GaAuthor | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}) {
  const { article, author, categoryName, categorySlug } = input;
  const url = articleCanonical(article);
  const origin = getSiteOrigin();
  const crumbs = [
    { name: "Growth Academy", path: "/academy" },
    ...(categoryName
      ? [
          {
            name: categoryName,
            path: categorySlug ? `/academy/c/${categorySlug}` : undefined,
          },
        ]
      : []),
    { name: article.title, path: `/academy/${article.slug}` },
  ];

  const nodes: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt,
      datePublished: article.publishedAt?.toISOString(),
      dateModified: article.updatedAt.toISOString(),
      author: author
        ? {
            "@type": "Person",
            name: author.name,
            url: absoluteUrl(`/academy/author/${author.slug}`),
          }
        : { "@type": "Organization", name: "MoneyGap AI", url: origin },
      publisher: {
        "@type": "Organization",
        name: "MoneyGap AI",
        url: origin,
      },
      mainEntityOfPage: url,
      image: article.ogImage || article.featuredImageUrl || undefined,
    },
    breadcrumbJsonLd(crumbs),
  ];

  const faq = (article.faqJson ?? []) as GaFaqItem[];
  if (faq.length > 0) {
    nodes.push(faqPageJsonLd(faq));
  }

  return nodes;
}

export function buildRssXml(
  items: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: Date | null;
  }[],
): string {
  const origin = getSiteOrigin();
  const channelItems = items
    .map((item) => {
      const link = absoluteUrl(`/academy/${item.slug}`);
      return `<item>
  <title><![CDATA[${item.title}]]></title>
  <link>${link}</link>
  <guid>${link}</guid>
  <description><![CDATA[${item.excerpt ?? ""}]]></description>
  ${item.publishedAt ? `<pubDate>${item.publishedAt.toUTCString()}</pubDate>` : ""}
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>MoneyGap Growth Academy™</title>
  <link>${origin}/academy</link>
  <description>SEO, conversion, and AI growth education from MoneyGap AI.</description>
  ${channelItems}
</channel>
</rss>`;
}
