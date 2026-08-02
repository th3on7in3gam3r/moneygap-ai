import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StartFreeButton } from "@/components/auth-buttons";
import { MarkdownBody } from "@/components/growth-academy/markdown-body";
import { ShareBar } from "@/components/growth-academy/share-bar";
import {
  adjacentArticles,
  articleCanonical,
  articleJsonLd,
  articleMetadata,
  categoriesForArticle,
  getArticleBySlug,
  getAuthorById,
  incrementArticleViews,
  isGrowthAcademyEnabled,
  listPublishedArticles,
  markdownToHtml,
  tagsForArticle,
} from "@/lib/growth-academy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, { allowDraft: true });
  if (!article || (article.status !== "published" && article.status !== "draft")) {
    return { title: "Article" };
  }
  const author = await getAuthorById(article.authorId);
  return articleMetadata(article, author);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AcademyArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  if (!isGrowthAcademyEnabled()) notFound();
  const { slug } = await params;
  const { preview } = await searchParams;
  const wantsPreview = preview === "1";

  let allowDraft = false;
  if (wantsPreview) {
    const session = await auth();
    allowDraft = Boolean(session.userId);
  }

  const article = await getArticleBySlug(slug, { allowDraft });
  if (!article) notFound();
  if (article.status !== "published" && !(allowDraft && wantsPreview)) {
    notFound();
  }

  if (article.status === "published") {
    void incrementArticleViews(article.id);
  }

  const [author, categories, tags, nav, related] = await Promise.all([
    getAuthorById(article.authorId),
    categoriesForArticle(article.id),
    tagsForArticle(article.id),
    adjacentArticles(article.publishedAt, article.id),
    listPublishedArticles({ limit: 6 }),
  ]);

  const { html, toc } = markdownToHtml(article.bodyMarkdown);
  const url = articleCanonical(article);
  const jsonLd = articleJsonLd({
    article,
    author,
    categoryName: categories[0]?.name,
    categorySlug: categories[0]?.slug,
  });
  const relatedFiltered = related.filter((r) => r.id !== article.id).slice(0, 4);
  const authorInitial = (author?.name ?? "M").trim().charAt(0).toUpperCase();
  const category = categories[0];

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Masthead */}
      <header className="relative overflow-hidden border-b border-border bg-hero">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
          <nav className="animate-rise flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
            <Link href="/academy" className="hover:text-accent">
              Growth Academy™
            </Link>
            {category ? (
              <>
                <span aria-hidden>/</span>
                <Link
                  href={`/academy/c/${category.slug}`}
                  className="hover:text-accent"
                >
                  {category.name}
                </Link>
              </>
            ) : null}
          </nav>

          {article.status !== "published" ? (
            <p className="mt-4 rounded-xl border border-border bg-bg-elevated/80 px-3 py-2 text-sm text-fg-muted backdrop-blur">
              Preview mode — draft not published.
            </p>
          ) : null}

          {category ? (
            <p className="animate-rise-delay-1 mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {category.name}
            </p>
          ) : null}

          <h1 className="animate-rise-delay-1 mt-3 max-w-3xl font-display text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-fg sm:text-5xl sm:leading-[1.08]">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="animate-rise-delay-2 mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl">
              {article.excerpt}
            </p>
          ) : null}

          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-4">
            {author ? (
              <Link
                href={`/academy/author/${author.slug}`}
                className="group flex items-center gap-3"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 font-display text-sm font-semibold text-accent ring-1 ring-accent/25">
                  {authorInitial}
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg group-hover:text-accent">
                    {author.name}
                  </span>
                  {author.bio ? (
                    <span className="mt-0.5 block max-w-xs text-xs leading-snug text-fg-subtle line-clamp-2">
                      {author.bio}
                    </span>
                  ) : null}
                </span>
              </Link>
            ) : null}

            <div className="hidden h-10 w-px bg-border sm:block" aria-hidden />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              {article.publishedAt ? (
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatDate(article.publishedAt)}
                </time>
              ) : null}
              <span aria-hidden className="text-fg-subtle">
                ·
              </span>
              <span>{article.readingTimeMinutes} min read</span>
            </div>
          </div>

          <div className="animate-rise-delay-3 mt-8 max-w-3xl">
            <ShareBar title={article.title} url={url} articleId={article.id} />
          </div>
        </div>
      </header>

      {/* Body + TOC */}
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16 lg:py-16">
        <div className="min-w-0">
          <MarkdownBody html={html} />

          {article.faqJson?.length ? (
            <section className="mt-16 border-t border-border pt-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                Common questions
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                FAQ
              </h2>
              <div className="mt-8 divide-y divide-border border-y border-border">
                {article.faqJson.map((f) => (
                  <details key={f.question} className="group py-5">
                    <summary className="cursor-pointer list-none font-display text-base font-semibold tracking-tight text-fg marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-4">
                        {f.question}
                        <span className="mt-0.5 text-fg-subtle transition group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-fg-muted">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/academy/tag/${t.slug}`}
                  className="text-xs text-fg-subtle transition hover:text-accent"
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          ) : null}

          {/* End CTA */}
          <aside className="mt-14 overflow-hidden rounded-[1.5rem] border border-border bg-hero">
            <div className="relative px-6 py-8 sm:px-8">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
              <div className="relative">
                <p className="font-display text-xl font-semibold tracking-tight text-fg">
                  Find the revenue this page is leaving behind
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                  Run MoneyGap AI on your site — get Money Gaps, AI Estimates, and a
                  Fix Path™ you can ship with human review.
                </p>
                <div className="mt-5">
                  <StartFreeButton label="Analyze your site" />
                </div>
              </div>
            </div>
          </aside>

          {/* Prev / next */}
          <nav className="mt-12 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
            {nav.prev ? (
              <Link
                href={`/academy/${nav.prev.slug}`}
                className="group flex flex-col gap-2 sm:pr-4"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </span>
                <span className="font-display text-base font-semibold leading-snug tracking-tight text-fg transition group-hover:text-accent">
                  {nav.prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {nav.next ? (
              <Link
                href={`/academy/${nav.next.slug}`}
                className="group flex flex-col gap-2 sm:items-end sm:pl-4 sm:text-right"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                  Next <ArrowRight className="h-3 w-3" />
                </span>
                <span className="font-display text-base font-semibold leading-snug tracking-tight text-fg transition group-hover:text-accent">
                  {nav.next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        </div>

        <aside className="hidden lg:block">
          {toc.length > 0 ? (
            <div className="sticky top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                On this page
              </p>
              <ul className="mt-4 space-y-0 border-l border-border">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`block border-l-2 border-transparent py-1.5 text-[13px] leading-snug text-fg-muted transition hover:border-accent hover:text-fg ${
                        item.level === 3 ? "pl-5" : "pl-3"
                      }`}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Related — list, not card grid */}
      {relatedFiltered.length > 0 ? (
        <section className="border-t border-border bg-bg-muted/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              Keep reading
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Related in Growth Academy™
            </h2>
            <ol className="mt-8 divide-y divide-border border-y border-border">
              {relatedFiltered.map((a, i) => (
                <li key={a.id}>
                  <Link
                    href={`/academy/${a.slug}`}
                    className="group flex items-baseline gap-4 py-5 sm:gap-6"
                  >
                    <span className="font-display text-sm font-semibold tabular-nums text-fg-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-semibold tracking-tight text-fg transition group-hover:text-accent">
                        {a.title}
                      </span>
                      {a.excerpt ? (
                        <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-fg-muted line-clamp-2">
                          {a.excerpt}
                        </span>
                      ) : null}
                    </span>
                    <span className="hidden shrink-0 text-xs text-fg-subtle sm:block">
                      {a.readingTimeMinutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link
              href="/academy"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Browse all articles <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      ) : null}
    </article>
  );
}
