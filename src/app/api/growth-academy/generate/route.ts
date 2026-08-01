import { auth } from "@clerk/nextjs/server";
import {
  ensureDefaultAuthor,
  ensureGrowthAcademyCatalog,
  generateArticleDraft,
  isGrowthAcademyEnabled,
  listCategories,
  upsertArticle,
} from "@/lib/growth-academy";
import { MISSING_KEYS_ERROR } from "@/lib/analysis/stages";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 403 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: MISSING_KEYS_ERROR }, { status: 400 });
  }

  try {
    await ensureGrowthAcademyCatalog();
    const body = (await req.json()) as {
      topic?: string;
      angle?: string;
      categoryHint?: string;
      categoryId?: string;
    };
    if (!body.topic?.trim()) {
      return Response.json({ error: "topic required" }, { status: 400 });
    }

    const pack = await generateArticleDraft({
      topic: body.topic.trim(),
      angle: body.angle,
      categoryHint: body.categoryHint,
    });

    const author = await ensureDefaultAuthor();
    const categories = await listCategories();
    const categoryIds = body.categoryId
      ? [body.categoryId]
      : categories
          .filter((c) => c.slug === "articles" || c.slug === "seo")
          .slice(0, 1)
          .map((c) => c.id);

    const article = await upsertArticle({
      title: pack.title,
      excerpt: pack.excerpt,
      bodyMarkdown: pack.bodyMarkdown,
      seoTitle: pack.seoTitle,
      seoDescription: pack.seoDescription,
      faqJson: pack.faqJson,
      aiAssist: pack.aiAssist,
      status: "draft",
      authorId: author.id,
      categoryIds,
      tagNames: pack.suggestedTags,
      userId,
      saveVersion: false,
    });

    return Response.json({
      ok: true,
      article,
      message: "Draft created for human review — not published.",
    });
  } catch (err) {
    console.error("ga generate", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
