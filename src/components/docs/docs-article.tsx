import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MarkdownBody } from "@/components/growth-academy/markdown-body";
import type { TocItem } from "@/lib/growth-academy/markdown";
import type { PublicDocEntry } from "@/lib/docs/catalog";
import { PUBLIC_DOC_CATEGORY_LABELS } from "@/lib/docs/catalog";

export function DocsArticle({
  title,
  category,
  summary,
  html,
  toc,
  prev,
  next,
}: {
  title: string;
  category: PublicDocEntry["category"];
  summary: string;
  html: string;
  toc: TocItem[];
  prev: PublicDocEntry | null;
  next: PublicDocEntry | null;
}) {
  return (
    <article>
      <header className="border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
          {PUBLIC_DOC_CATEGORY_LABELS[category]}
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">
          {summary}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <MarkdownBody html={html} />
        </div>
        {toc.length > 0 ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                On this page
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
                    <a
                      href={`#${item.id}`}
                      className="text-fg-muted transition hover:text-fg"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>

      <nav
        aria-label="Adjacent guides"
        className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-border px-4 py-4 transition hover:border-border-strong"
          >
            <ArrowLeft className="mt-0.5 size-4 shrink-0 text-fg-subtle transition group-hover:text-accent" />
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Previous
              </span>
              <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">
                {prev.title}
              </span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="group flex items-start justify-end gap-3 rounded-xl border border-border px-4 py-4 text-right transition hover:border-border-strong"
          >
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
                Next
              </span>
              <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">
                {next.title}
              </span>
            </span>
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-fg-subtle transition group-hover:text-accent" />
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
