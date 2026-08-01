import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/growth-academy/article-card";
import {
  getCategoryBySlug,
  isGrowthAcademyEnabled,
  listPublishedArticles,
} from "@/lib/growth-academy";

export default async function AcademyCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  if (!isGrowthAcademyEnabled()) notFound();
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const articles = await listPublishedArticles({ categorySlug: slug, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Growth Academy™
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        {category.name}
      </h1>
      {category.description ? (
        <p className="mt-2 max-w-2xl text-fg-muted">{category.description}</p>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {articles.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">No published articles in this section yet.</p>
      ) : null}
    </div>
  );
}
