import { auth } from "@clerk/nextjs/server";
import type { GaArticleStatus } from "@/db/schema";
import {
  ensureDefaultAuthor,
  ensureGrowthAcademyCatalog,
  isGrowthAcademyEnabled,
  listArticlesForCms,
  listAuthors,
  listCategories,
  listOpenContentIdeas,
  upsertArticle,
} from "@/lib/growth-academy";

export async function GET(req: Request) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ enabled: false, message: "Growth Academy™ disabled" });
  }

  await ensureGrowthAcademyCatalog();
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "all") as GaArticleStatus | "all";
  const [articles, categories, authors, ideas] = await Promise.all([
    listArticlesForCms(status),
    listCategories(),
    listAuthors(),
    listOpenContentIdeas(),
  ]);

  return Response.json({
    enabled: true,
    articles,
    categories,
    authors,
    ideas,
  });
}

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }

  await ensureGrowthAcademyCatalog();
  const author = await ensureDefaultAuthor();
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    excerpt?: string;
    bodyMarkdown?: string;
    status?: GaArticleStatus;
    categoryIds?: string[];
    tagNames?: string[];
    authorId?: string;
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
    featuredImageUrl?: string;
  };

  if (!body.title?.trim()) {
    return Response.json({ error: "title required" }, { status: 400 });
  }

  const article = await upsertArticle({
    title: body.title.trim(),
    slug: body.slug,
    excerpt: body.excerpt,
    bodyMarkdown: body.bodyMarkdown ?? "",
    status: body.status ?? "draft",
    categoryIds: body.categoryIds,
    tagNames: body.tagNames,
    authorId: body.authorId ?? author.id,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription,
    featured: body.featured,
    featuredImageUrl: body.featuredImageUrl,
    userId,
    saveVersion: false,
  });

  return Response.json({ ok: true, article });
}
