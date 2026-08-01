import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { gaArticles } from "@/db/schema";
import { SITE_ORIGIN } from "./constants";

export type LinkSuggestion = {
  href: string;
  label: string;
  reason: string;
};

/** Product + marketing destinations editors can insert manually. */
export function staticProductLinkSuggestions(): LinkSuggestion[] {
  return [
    {
      href: `${SITE_ORIGIN}/pricing`,
      label: "Pricing",
      reason: "Conversion path for readers ready to evaluate plans",
    },
    {
      href: `${SITE_ORIGIN}/about`,
      label: "About MoneyGap AI",
      reason: "Trust and brand context",
    },
    {
      href: `${SITE_ORIGIN}/academy`,
      label: "Growth Academy™",
      reason: "Related educational content hub",
    },
    {
      href: `${SITE_ORIGIN}/sign-up`,
      label: "Start free analysis",
      reason: "Primary product CTA",
    },
    {
      href: "/dashboard/copilot",
      label: "AI Growth Copilot™",
      reason: "In-product advisory (signed-in)",
    },
    {
      href: "/dashboard/money-gaps",
      label: "Money Gaps",
      reason: "Connect education to live opportunities",
    },
    {
      href: "/dashboard/analyze",
      label: "Analyze a website",
      reason: "Activation path after reading",
    },
  ];
}

export async function relatedArticleLinkSuggestions(
  articleId: string | null,
  limit = 5,
): Promise<LinkSuggestion[]> {
  const rows = await db
    .select({
      slug: gaArticles.slug,
      title: gaArticles.title,
      excerpt: gaArticles.excerpt,
    })
    .from(gaArticles)
    .where(
      articleId
        ? and(eq(gaArticles.status, "published"), ne(gaArticles.id, articleId))
        : eq(gaArticles.status, "published"),
    )
    .orderBy(desc(gaArticles.publishedAt))
    .limit(limit);

  return rows.map((r) => ({
    href: `${SITE_ORIGIN}/academy/${r.slug}`,
    label: r.title,
    reason: r.excerpt?.slice(0, 120) || "Related Growth Academy article",
  }));
}

export async function buildInternalLinkSuggestions(
  articleId: string | null,
): Promise<LinkSuggestion[]> {
  const related = await relatedArticleLinkSuggestions(articleId, 4);
  return [...related, ...staticProductLinkSuggestions()];
}
