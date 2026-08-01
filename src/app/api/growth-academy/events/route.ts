import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gaArticleEvents, gaArticles } from "@/db/schema";
import { isGrowthAcademyEnabled } from "@/lib/growth-academy";

export async function POST(req: Request) {
  if (!isGrowthAcademyEnabled()) {
    return Response.json({ error: "Disabled" }, { status: 404 });
  }
  try {
    const body = (await req.json()) as {
      articleId?: string;
      eventType?: string;
      meta?: Record<string, unknown>;
    };
    if (!body.articleId || !body.eventType) {
      return Response.json({ error: "articleId and eventType required" }, { status: 400 });
    }
    const article = await db.query.gaArticles.findFirst({
      where: eq(gaArticles.id, body.articleId),
    });
    if (!article) return Response.json({ error: "Not found" }, { status: 404 });

    await db.insert(gaArticleEvents).values({
      articleId: body.articleId,
      eventType: body.eventType.slice(0, 40),
      meta: body.meta ?? {},
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("ga events", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
