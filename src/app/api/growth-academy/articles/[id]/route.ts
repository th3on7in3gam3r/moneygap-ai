import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gaArticles, type GaArticleStatus, type GaFaqItem, type GaAiAssist } from "@/db/schema";
import {
  buildInternalLinkSuggestions,
  categoriesForArticle,
  deleteArticle,
  isGrowthAcademyEnabled,
  listVersions,
  restoreVersion,
  setArticleStatus,
  tagsForArticle,
  upsertArticle,
} from "@/lib/growth-academy";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }

  const { id } = await context.params;
  const article = await db.query.gaArticles.findFirst({
    where: eq(gaArticles.id, id),
  });
  if (!article) return Response.json({ error: "Not found" }, { status: 404 });

  const [categories, tags, versions, linkSuggestions] = await Promise.all([
    categoriesForArticle(id),
    tagsForArticle(id),
    listVersions(id),
    buildInternalLinkSuggestions(id),
  ]);

  return Response.json({
    article,
    categories,
    tags,
    versions,
    linkSuggestions,
  });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    bodyMarkdown?: string;
    status?: GaArticleStatus;
    scheduledAt?: string | null;
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
    action?: "publish" | "schedule" | "archive" | "draft" | "restore";
    versionId?: string;
  };

  if (body.action === "restore" && body.versionId) {
    const article = await restoreVersion(id, body.versionId, userId);
    return Response.json({ ok: true, article });
  }

  if (body.action === "publish") {
    const article = await setArticleStatus(id, "published", { userId });
    return Response.json({ ok: true, article });
  }
  if (body.action === "archive") {
    const article = await setArticleStatus(id, "archived", { userId });
    return Response.json({ ok: true, article });
  }
  if (body.action === "draft") {
    const article = await setArticleStatus(id, "draft", { userId });
    return Response.json({ ok: true, article });
  }
  if (body.action === "schedule") {
    const article = await setArticleStatus(id, "scheduled", {
      userId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
    });
    return Response.json({ ok: true, article });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "title required" }, { status: 400 });
  }

  const article = await upsertArticle({
    id,
    title: body.title.trim(),
    slug: body.slug,
    excerpt: body.excerpt,
    bodyMarkdown: body.bodyMarkdown,
    status: body.status,
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    featuredImageUrl: body.featuredImageUrl,
    authorId: body.authorId,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    canonicalUrl: body.canonicalUrl,
    ogImage: body.ogImage,
    faqJson: body.faqJson,
    aiAssist: body.aiAssist,
    featured: body.featured,
    categoryIds: body.categoryIds,
    tagNames: body.tagNames,
    userId,
  });

  return Response.json({ ok: true, article });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }
  const { id } = await context.params;
  await deleteArticle(id);
  return Response.json({ ok: true });
}
