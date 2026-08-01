import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/growth-academy/article-card";
import {
  getAuthorBySlug,
  isGrowthAcademyEnabled,
  listPublishedArticles,
} from "@/lib/growth-academy";

export default async function AcademyAuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isGrowthAcademyEnabled()) notFound();
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();
  const articles = await listPublishedArticles({ authorSlug: slug, limit: 48 });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Author</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{author.name}</h1>
      {author.bio ? <p className="mt-3 max-w-2xl text-fg-muted">{author.bio}</p> : null}
      {author.expertise?.length ? (
        <p className="mt-2 text-sm text-fg-subtle">
          Expertise: {author.expertise.join(" · ")}
        </p>
      ) : null}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
