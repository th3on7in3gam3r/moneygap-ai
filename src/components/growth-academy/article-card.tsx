import Link from "next/link";
import type { GaArticle } from "@/db/schema";

export function ArticleCard({ article }: { article: GaArticle }) {
  return (
    <Link
      href={`/academy/${article.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-bg-elevated p-5 transition hover:border-border-strong"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
        {article.readingTimeMinutes} min read
        {article.featured ? " · Featured" : ""}
      </p>
      <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-fg group-hover:text-accent">
        {article.title}
      </h3>
      {article.excerpt ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">
          {article.excerpt}
        </p>
      ) : null}
    </Link>
  );
}
