import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCuratedLabArticle, CURATED_LAB_ARTICLES } from "@/lib/labs/curated";
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  jsonLdScript,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CURATED_LAB_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getCuratedLabArticle(slug);
  if (!article) {
    return buildPageMetadata({
      title: "Lab comparison — MoneyGap AI",
      description: "Curated performance and metadata comparisons.",
      path: `/labs/compare/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `${article.title} — MoneyGap Labs`,
    description: article.description,
    path: `/labs/compare/${article.slug}`,
  });
}

export default async function CuratedComparePage({ params }: Props) {
  const { slug } = await params;
  const article = getCuratedLabArticle(slug);
  if (!article) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: article.title,
            description: article.description,
            author: { "@type": "Organization", name: "MoneyGap AI" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Labs", path: "/labs" },
              { name: article.title, path: `/labs/compare/${article.slug}` },
            ]),
          ),
        }}
      />
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          Curated comparison
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-base text-fg-muted">{article.description}</p>
        <div className="prose-marketing mt-8 space-y-4 text-sm leading-relaxed text-fg-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_code]:rounded [&_code]:bg-bg-muted [&_code]:px-1">
          {article.body.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h2 key={i}>{line.replace(/^## /, "")}</h2>
              );
            }
            if (line.startsWith("|")) {
              return (
                <p key={i} className="font-mono text-xs text-fg">
                  {line}
                </p>
              );
            }
            if (!line.trim()) return null;
            return <p key={i}>{line}</p>;
          })}
        </div>
        <Link
          href="/labs/compare"
          className="mt-10 inline-block text-sm text-accent hover:underline"
        >
          Interactive URL compare →
        </Link>
      </article>
    </>
  );
}
