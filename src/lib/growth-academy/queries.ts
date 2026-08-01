import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  gaArticleCategories,
  gaArticles,
  gaArticleTags,
  gaAuthors,
  gaCategories,
  gaContentIdeas,
  gaTags,
  type GaArticleStatus,
} from "@/db/schema";

export async function listPublishedArticles(opts?: {
  limit?: number;
  featured?: boolean;
  categorySlug?: string;
  tagSlug?: string;
  authorSlug?: string;
  q?: string;
}) {
  const limit = opts?.limit ?? 24;

  if (opts?.categorySlug) {
    const cat = await db.query.gaCategories.findFirst({
      where: eq(gaCategories.slug, opts.categorySlug),
    });
    if (!cat) return [];
    const links = await db
      .select({ articleId: gaArticleCategories.articleId })
      .from(gaArticleCategories)
      .where(eq(gaArticleCategories.categoryId, cat.id));
    const ids = links.map((l) => l.articleId);
    if (ids.length === 0) return [];
    return db
      .select()
      .from(gaArticles)
      .where(and(eq(gaArticles.status, "published"), inArray(gaArticles.id, ids)))
      .orderBy(desc(gaArticles.publishedAt))
      .limit(limit);
  }

  if (opts?.tagSlug) {
    const tag = await db.query.gaTags.findFirst({
      where: eq(gaTags.slug, opts.tagSlug),
    });
    if (!tag) return [];
    const links = await db
      .select({ articleId: gaArticleTags.articleId })
      .from(gaArticleTags)
      .where(eq(gaArticleTags.tagId, tag.id));
    const ids = links.map((l) => l.articleId);
    if (ids.length === 0) return [];
    return db
      .select()
      .from(gaArticles)
      .where(and(eq(gaArticles.status, "published"), inArray(gaArticles.id, ids)))
      .orderBy(desc(gaArticles.publishedAt))
      .limit(limit);
  }

  if (opts?.authorSlug) {
    const author = await db.query.gaAuthors.findFirst({
      where: eq(gaAuthors.slug, opts.authorSlug),
    });
    if (!author) return [];
    return db
      .select()
      .from(gaArticles)
      .where(
        and(eq(gaArticles.status, "published"), eq(gaArticles.authorId, author.id)),
      )
      .orderBy(desc(gaArticles.publishedAt))
      .limit(limit);
  }

  const filters = [eq(gaArticles.status, "published")];
  if (opts?.featured) filters.push(eq(gaArticles.featured, true));
  if (opts?.q?.trim()) {
    const q = `%${opts.q.trim()}%`;
    filters.push(
      or(
        ilike(gaArticles.title, q),
        ilike(gaArticles.excerpt, q),
        ilike(gaArticles.bodyMarkdown, q),
      )!,
    );
  }

  return db
    .select()
    .from(gaArticles)
    .where(and(...filters))
    .orderBy(desc(gaArticles.publishedAt), desc(gaArticles.createdAt))
    .limit(limit);
}

export async function listTrendingArticles(limit = 6) {
  return db
    .select()
    .from(gaArticles)
    .where(eq(gaArticles.status, "published"))
    .orderBy(desc(gaArticles.viewCount), desc(gaArticles.publishedAt))
    .limit(limit);
}

export async function getArticleBySlug(slug: string, opts?: { allowDraft?: boolean }) {
  const row = await db.query.gaArticles.findFirst({
    where: eq(gaArticles.slug, slug),
  });
  if (!row) return null;
  if (!opts?.allowDraft && row.status !== "published") return null;
  return row;
}

export async function getAuthorById(id: string | null) {
  if (!id) return null;
  return db.query.gaAuthors.findFirst({ where: eq(gaAuthors.id, id) });
}

export async function getAuthorBySlug(slug: string) {
  return db.query.gaAuthors.findFirst({ where: eq(gaAuthors.slug, slug) });
}

export async function listCategories() {
  return db.select().from(gaCategories).orderBy(asc(gaCategories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  return db.query.gaCategories.findFirst({ where: eq(gaCategories.slug, slug) });
}

export async function getTagBySlug(slug: string) {
  return db.query.gaTags.findFirst({ where: eq(gaTags.slug, slug) });
}

export async function categoriesForArticle(articleId: string) {
  const links = await db
    .select({ categoryId: gaArticleCategories.categoryId })
    .from(gaArticleCategories)
    .where(eq(gaArticleCategories.articleId, articleId));
  if (links.length === 0) return [];
  return db
    .select()
    .from(gaCategories)
    .where(
      inArray(
        gaCategories.id,
        links.map((l) => l.categoryId),
      ),
    );
}

export async function tagsForArticle(articleId: string) {
  const links = await db
    .select({ tagId: gaArticleTags.tagId })
    .from(gaArticleTags)
    .where(eq(gaArticleTags.articleId, articleId));
  if (links.length === 0) return [];
  return db
    .select()
    .from(gaTags)
    .where(
      inArray(
        gaTags.id,
        links.map((l) => l.tagId),
      ),
    );
}

export async function adjacentArticles(publishedAt: Date | null, articleId: string) {
  if (!publishedAt) return { prev: null, next: null };
  const next = await db
    .select()
    .from(gaArticles)
    .where(
      and(
        eq(gaArticles.status, "published"),
        sql`${gaArticles.publishedAt} > ${publishedAt}`,
      ),
    )
    .orderBy(asc(gaArticles.publishedAt))
    .limit(1);
  const prev = await db
    .select()
    .from(gaArticles)
    .where(
      and(
        eq(gaArticles.status, "published"),
        sql`${gaArticles.publishedAt} < ${publishedAt}`,
      ),
    )
    .orderBy(desc(gaArticles.publishedAt))
    .limit(1);
  return {
    prev: prev[0] && prev[0].id !== articleId ? prev[0] : null,
    next: next[0] && next[0].id !== articleId ? next[0] : null,
  };
}

export async function listArticlesForCms(status?: GaArticleStatus | "all") {
  if (!status || status === "all") {
    return db.select().from(gaArticles).orderBy(desc(gaArticles.updatedAt)).limit(200);
  }
  return db
    .select()
    .from(gaArticles)
    .where(eq(gaArticles.status, status))
    .orderBy(desc(gaArticles.updatedAt))
    .limit(200);
}

export async function listAuthors() {
  return db.select().from(gaAuthors).orderBy(asc(gaAuthors.name));
}

export async function listOpenContentIdeas() {
  return db
    .select()
    .from(gaContentIdeas)
    .where(eq(gaContentIdeas.status, "open"))
    .orderBy(asc(gaContentIdeas.sortOrder), desc(gaContentIdeas.createdAt));
}

export async function incrementArticleViews(articleId: string) {
  await db
    .update(gaArticles)
    .set({ viewCount: sql`${gaArticles.viewCount} + 1` })
    .where(eq(gaArticles.id, articleId));
}
