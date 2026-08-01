import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  gaArticleCategories,
  gaArticles,
  gaArticleTags,
  gaArticleVersions,
  gaAuthors,
  gaCategories,
  gaContentIdeas,
  gaTags,
  type GaAiAssist,
  type GaArticleStatus,
  type GaFaqItem,
} from "@/db/schema";
import { DEFAULT_CONTENT_IDEAS, GA_SECTIONS } from "./constants";
import { estimateReadingTimeMinutes, slugify } from "./slug";

export async function ensureGrowthAcademyCatalog() {
  for (const [i, section] of GA_SECTIONS.entries()) {
    const existing = await db.query.gaCategories.findFirst({
      where: eq(gaCategories.slug, section.slug),
    });
    if (existing) continue;
    await db.insert(gaCategories).values({
      slug: section.slug,
      name: section.name,
      description: section.description,
      sectionType: section.sectionType,
      sortOrder: i,
    });
  }

  const ideas = await db.select().from(gaContentIdeas).limit(1);
  if (ideas.length === 0) {
    for (const [i, idea] of DEFAULT_CONTENT_IDEAS.entries()) {
      await db.insert(gaContentIdeas).values({
        title: idea.title,
        summary: idea.summary,
        theme: idea.theme,
        sortOrder: i,
      });
    }
  }
}

export async function ensureDefaultAuthor() {
  const existing = await db.query.gaAuthors.findFirst({
    where: eq(gaAuthors.slug, "moneygap-editorial"),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(gaAuthors)
    .values({
      slug: "moneygap-editorial",
      name: "MoneyGap Editorial",
      bio: "Growth operators and product educators behind MoneyGap AI.",
      expertise: ["SEO", "Conversion", "AI Visibility", "Growth Systems"],
      socials: { website: "https://www.moneygap-ai.com" },
    })
    .returning();
  return row;
}

const RESERVED_SLUGS = new Set([
  "c",
  "tag",
  "author",
  "search",
  "rss.xml",
  "rss",
]);

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "article";
  if (RESERVED_SLUGS.has(slug)) slug = `article-${slug}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const found = await db.query.gaArticles.findFirst({
      where: eq(gaArticles.slug, candidate),
    });
    if (!found || found.id === excludeId) return candidate;
    n += 1;
  }
}

export type UpsertArticleInput = {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  bodyMarkdown?: string;
  status?: GaArticleStatus;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  featuredImageUrl?: string | null;
  authorId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
  faqJson?: GaFaqItem[];
  aiAssist?: GaAiAssist;
  featured?: boolean;
  categoryIds?: string[];
  tagNames?: string[];
  userId?: string | null;
  saveVersion?: boolean;
};

export async function upsertArticle(input: UpsertArticleInput) {
  const slug = await uniqueSlug(input.slug || input.title, input.id);
  const body = input.bodyMarkdown ?? "";
  const readingTimeMinutes = estimateReadingTimeMinutes(body);
  const now = new Date();

  let articleId = input.id;
  if (articleId) {
    const existing = await db.query.gaArticles.findFirst({
      where: eq(gaArticles.id, articleId),
    });
    if (!existing) throw new Error("Article not found");

    if (input.saveVersion !== false) {
      await db.insert(gaArticleVersions).values({
        articleId,
        version: existing.version,
        title: existing.title,
        bodyMarkdown: existing.bodyMarkdown,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
        snapshot: {
          status: existing.status,
          excerpt: existing.excerpt,
          faqJson: existing.faqJson,
        },
        createdByUserId: input.userId ?? null,
      });
    }

    const [updated] = await db
      .update(gaArticles)
      .set({
        title: input.title,
        slug,
        excerpt: input.excerpt ?? existing.excerpt,
        bodyMarkdown: body || existing.bodyMarkdown,
        status: input.status ?? existing.status,
        publishedAt:
          input.publishedAt !== undefined ? input.publishedAt : existing.publishedAt,
        scheduledAt:
          input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt,
        featuredImageUrl:
          input.featuredImageUrl !== undefined
            ? input.featuredImageUrl
            : existing.featuredImageUrl,
        authorId: input.authorId !== undefined ? input.authorId : existing.authorId,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDescription:
          input.seoDescription !== undefined
            ? input.seoDescription
            : existing.seoDescription,
        canonicalUrl:
          input.canonicalUrl !== undefined ? input.canonicalUrl : existing.canonicalUrl,
        ogImage: input.ogImage !== undefined ? input.ogImage : existing.ogImage,
        faqJson: input.faqJson ?? existing.faqJson,
        aiAssist: input.aiAssist ?? existing.aiAssist,
        featured: input.featured ?? existing.featured,
        readingTimeMinutes,
        version: existing.version + 1,
        updatedAt: now,
      })
      .where(eq(gaArticles.id, articleId))
      .returning();

    if (input.categoryIds) {
      await db
        .delete(gaArticleCategories)
        .where(eq(gaArticleCategories.articleId, articleId));
      for (const categoryId of input.categoryIds) {
        await db.insert(gaArticleCategories).values({ articleId, categoryId });
      }
    }
    if (input.tagNames) {
      await syncTags(articleId, input.tagNames);
    }
    return updated;
  }

  const [created] = await db
    .insert(gaArticles)
    .values({
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      bodyMarkdown: body,
      status: input.status ?? "draft",
      publishedAt: input.publishedAt ?? null,
      scheduledAt: input.scheduledAt ?? null,
      featuredImageUrl: input.featuredImageUrl ?? null,
      authorId: input.authorId ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      ogImage: input.ogImage ?? null,
      faqJson: input.faqJson ?? [],
      aiAssist: input.aiAssist ?? {},
      featured: input.featured ?? false,
      readingTimeMinutes,
      createdByUserId: input.userId ?? null,
    })
    .returning();

  articleId = created.id;
  if (input.categoryIds?.length) {
    for (const categoryId of input.categoryIds) {
      await db.insert(gaArticleCategories).values({ articleId, categoryId });
    }
  }
  if (input.tagNames?.length) {
    await syncTags(articleId, input.tagNames);
  }
  return created;
}

async function syncTags(articleId: string, tagNames: string[]) {
  await db.delete(gaArticleTags).where(eq(gaArticleTags.articleId, articleId));
  for (const name of tagNames) {
    const slug = slugify(name);
    if (!slug) continue;
    let tag = await db.query.gaTags.findFirst({ where: eq(gaTags.slug, slug) });
    if (!tag) {
      const [created] = await db.insert(gaTags).values({ slug, name }).returning();
      tag = created;
    }
    await db.insert(gaArticleTags).values({ articleId, tagId: tag.id });
  }
}

export async function setArticleStatus(
  id: string,
  status: GaArticleStatus,
  opts?: { scheduledAt?: Date | null; userId?: string | null },
) {
  const existing = await db.query.gaArticles.findFirst({
    where: eq(gaArticles.id, id),
  });
  if (!existing) throw new Error("Article not found");

  const publishedAt =
    status === "published"
      ? existing.publishedAt ?? new Date()
      : status === "draft" || status === "archived"
        ? existing.publishedAt
        : existing.publishedAt;

  return upsertArticle({
    id,
    title: existing.title,
    slug: existing.slug,
    bodyMarkdown: existing.bodyMarkdown,
    excerpt: existing.excerpt,
    status,
    publishedAt: status === "published" ? publishedAt : existing.publishedAt,
    scheduledAt: status === "scheduled" ? opts?.scheduledAt ?? existing.scheduledAt : null,
    userId: opts?.userId,
    saveVersion: true,
  });
}

export async function deleteArticle(id: string) {
  await db.delete(gaArticles).where(eq(gaArticles.id, id));
}

export async function restoreVersion(articleId: string, versionId: string, userId?: string) {
  const version = await db.query.gaArticleVersions.findFirst({
    where: and(
      eq(gaArticleVersions.id, versionId),
      eq(gaArticleVersions.articleId, articleId),
    ),
  });
  if (!version) throw new Error("Version not found");
  return upsertArticle({
    id: articleId,
    title: version.title,
    bodyMarkdown: version.bodyMarkdown,
    seoTitle: version.seoTitle,
    seoDescription: version.seoDescription,
    status: "draft",
    userId,
    saveVersion: true,
  });
}

export async function createDraftFromIdea(ideaId: string, userId?: string) {
  const idea = await db.query.gaContentIdeas.findFirst({
    where: eq(gaContentIdeas.id, ideaId),
  });
  if (!idea) throw new Error("Idea not found");
  const author = await ensureDefaultAuthor();
  const article = await upsertArticle({
    title: idea.title,
    excerpt: idea.summary,
    bodyMarkdown: `# ${idea.title}\n\n${idea.summary}\n\n## Outline\n\n- Context\n- What's missing\n- Fix Path™ steps\n- How MoneyGap AI helps\n\n*Draft for human review — not published.*\n`,
    status: "draft",
    authorId: author.id,
    userId,
    tagNames: [idea.theme],
  });
  await db
    .update(gaContentIdeas)
    .set({ status: "drafted", articleId: article.id })
    .where(eq(gaContentIdeas.id, ideaId));
  return article;
}

export async function listVersions(articleId: string) {
  return db
    .select()
    .from(gaArticleVersions)
    .where(eq(gaArticleVersions.articleId, articleId))
    .orderBy(desc(gaArticleVersions.version));
}
