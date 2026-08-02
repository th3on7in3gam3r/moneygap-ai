import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  gaArticleCategories,
  gaArticles,
  gaCategories,
  moneyGapOpportunities,
  reports,
} from "@/db/schema";
import { ensureGrowthAcademyCatalog } from "./service";
import { listPublishedArticles } from "./queries";

export type GapPlaybookRec = {
  gap: {
    id: string;
    title: string;
    category: string;
    moduleId: string;
    opportunityIndex: number | null;
    difficulty: string;
    reportId: string;
    websiteName: string | null;
    websiteDomain: string | null;
  };
  article: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
  } | null;
  sectionSlug: string | null;
  fixHref: string;
};

/** Map Money Gap module/category → Growth Academy category slug. */
export function sectionSlugForGap(input: {
  moduleId?: string | null;
  category?: string | null;
  title?: string | null;
}): string | null {
  const blob = [input.moduleId, input.category, input.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!blob.trim()) return null;

  const rules: Array<{ slug: string; keys: string[] }> = [
    {
      slug: "technical-seo",
      keys: ["technical_seo", "technical", "crawl", "index", "speed", "core web", "schema"],
    },
    {
      slug: "seo",
      keys: ["seo", "search", "organic", "keyword", "content", "buyer-intent", "seo_content"],
    },
    {
      slug: "conversion-optimization",
      keys: [
        "conversion",
        "cta",
        "checkout",
        "funnel",
        "landing",
        "form",
        "cro",
        "capture",
      ],
    },
    {
      slug: "ai",
      keys: ["ai", "chatbot", "llm", "geo", "generative", "prompt", "copilot"],
    },
    {
      slug: "marketing",
      keys: ["marketing", "acquisition", "ads", "email", "social", "campaign"],
    },
    {
      slug: "guides",
      keys: ["trust", "monetization", "revenue", "product", "pricing"],
    },
  ];

  for (const rule of rules) {
    if (rule.keys.some((k) => blob.includes(k))) return rule.slug;
  }
  return null;
}

async function newestArticleInCategory(categorySlug: string) {
  const cat = await db.query.gaCategories.findFirst({
    where: eq(gaCategories.slug, categorySlug),
  });
  if (!cat) return null;
  const links = await db
    .select({ articleId: gaArticleCategories.articleId })
    .from(gaArticleCategories)
    .where(eq(gaArticleCategories.categoryId, cat.id));
  const ids = links.map((l) => l.articleId);
  if (!ids.length) return null;
  const [row] = await db
    .select({
      id: gaArticles.id,
      slug: gaArticles.slug,
      title: gaArticles.title,
      excerpt: gaArticles.excerpt,
    })
    .from(gaArticles)
    .where(and(eq(gaArticles.status, "published"), inArray(gaArticles.id, ids)))
    .orderBy(desc(gaArticles.publishedAt))
    .limit(1);
  return row ?? null;
}

async function fallbackArticle() {
  const featured = await listPublishedArticles({ featured: true, limit: 1 });
  if (featured[0]) {
    return {
      id: featured[0].id,
      slug: featured[0].slug,
      title: featured[0].title,
      excerpt: featured[0].excerpt,
    };
  }
  const latest = await listPublishedArticles({ limit: 1 });
  if (!latest[0]) return null;
  return {
    id: latest[0].id,
    slug: latest[0].slug,
    title: latest[0].title,
    excerpt: latest[0].excerpt,
  };
}

/** Top open Money Gaps for a workspace, each with a matched Academy playbook. */
export async function recommendPlaybooksForOpenGaps(
  workspaceId: string,
  limit = 3,
): Promise<GapPlaybookRec[]> {
  await ensureGrowthAcademyCatalog();

  const workspaceReports = await db.query.reports.findMany({
    where: eq(reports.workspaceId, workspaceId),
    with: {
      website: { columns: { id: true, name: true, domain: true } },
    },
    orderBy: [desc(reports.createdAt)],
    limit: 20,
  });
  const reportIds = workspaceReports.map((r) => r.id);
  if (!reportIds.length) return [];

  const reportSite = new Map(
    workspaceReports.map((r) => [
      r.id,
      {
        websiteName: r.website?.name ?? null,
        websiteDomain: r.website?.domain ?? null,
      },
    ]),
  );

  const opps = await db.query.moneyGapOpportunities.findMany({
    where: inArray(moneyGapOpportunities.reportId, reportIds),
    orderBy: [desc(moneyGapOpportunities.createdAt)],
    limit: 60,
  });

  const open = opps
    .filter((o) => o.implementationStatus === "open")
    .sort((a, b) => (b.opportunityIndex ?? 0) - (a.opportunityIndex ?? 0))
    .slice(0, limit);

  const fallback = await fallbackArticle();
  const recs: GapPlaybookRec[] = [];

  for (const o of open) {
    const sectionSlug = sectionSlugForGap({
      moduleId: o.moduleId,
      category: o.category,
      title: o.title,
    });
    let article = sectionSlug
      ? await newestArticleInCategory(sectionSlug)
      : null;
    if (!article) article = fallback;

    const site = reportSite.get(o.reportId);
    recs.push({
      gap: {
        id: o.id,
        title: o.title,
        category: o.category,
        moduleId: o.moduleId,
        opportunityIndex: o.opportunityIndex,
        difficulty: o.difficulty,
        reportId: o.reportId,
        websiteName: site?.websiteName ?? null,
        websiteDomain: site?.websiteDomain ?? null,
      },
      article,
      sectionSlug,
      fixHref: `/reports/${o.reportId}`,
    });
  }

  return recs;
}
