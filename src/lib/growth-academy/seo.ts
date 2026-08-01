import type { Metadata } from "next";
import type { GaArticle, GaAuthor, GaFaqItem } from "@/db/schema";
import { SITE_ORIGIN } from "./constants";

export function articleCanonical(article: GaArticle): string {
  if (article.canonicalUrl?.trim()) return article.canonicalUrl.trim();
  return `${SITE_ORIGIN}/academy/${article.slug}`;
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

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "MoneyGap AI",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    authors: author ? [{ name: author.name }] : undefined,
  };
}

export function articleJsonLd(input: {
  article: GaArticle;
  author?: GaAuthor | null;
  categoryName?: string | null;
}) {
  const { article, author, categoryName } = input;
  const url = articleCanonical(article);
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
            url: `${SITE_ORIGIN}/academy/author/${author.slug}`,
          }
        : { "@type": "Organization", name: "MoneyGap AI" },
      publisher: {
        "@type": "Organization",
        name: "MoneyGap AI",
        url: SITE_ORIGIN,
      },
      mainEntityOfPage: url,
      image: article.ogImage || article.featuredImageUrl || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Growth Academy",
          item: `${SITE_ORIGIN}/academy`,
        },
        ...(categoryName
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: categoryName,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: categoryName ? 3 : 2,
          name: article.title,
          item: url,
        },
      ],
    },
  ];

  const faq = (article.faqJson ?? []) as GaFaqItem[];
  if (faq.length > 0) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return nodes;
}

export function buildRssXml(
  items: { title: string; slug: string; excerpt: string | null; publishedAt: Date | null }[],
): string {
  const channelItems = items
    .map((item) => {
      const link = `${SITE_ORIGIN}/academy/${item.slug}`;
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
  <link>${SITE_ORIGIN}/academy</link>
  <description>SEO, conversion, and AI growth education from MoneyGap AI.</description>
  ${channelItems}
</channel>
</rss>`;
}
