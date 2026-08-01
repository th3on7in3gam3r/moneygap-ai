import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/growth-academy/article-card";
import {
  getTagBySlug,
  isGrowthAcademyEnabled,
  listPublishedArticles,
} from "@/lib/growth-academy";

export default async function AcademyTagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  if (!isGrowthAcademyEnabled()) notFound();
  const { tag: slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();
  const articles = await listPublishedArticles({ tagSlug: slug, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Tag</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">#{tag.name}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
