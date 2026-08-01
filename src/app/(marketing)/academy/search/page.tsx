import { ArticleCard } from "@/components/growth-academy/article-card";
import { isGrowthAcademyEnabled, listPublishedArticles } from "@/lib/growth-academy";

export const metadata = {
  title: "Search · Growth Academy™",
};

export default async function AcademySearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isGrowthAcademyEnabled()) {
    return null;
  }
  const { q } = await searchParams;
  const results = q?.trim()
    ? await listPublishedArticles({ q: q.trim(), limit: 40 })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
        Growth Academy™
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Search</h1>
      <form className="mt-6" action="/academy/search" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search articles, guides, and insights…"
          className="w-full rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm text-fg outline-none ring-accent focus:ring-2"
        />
      </form>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {q?.trim() && results.length === 0 ? (
        <p className="mt-6 text-sm text-fg-muted">No articles matched “{q}”.</p>
      ) : null}
    </div>
  );
}
