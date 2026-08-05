import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  growthBriefs,
  reports,
  users,
  websites,
  workspaceMembers,
  workspaceOnboarding,
  workspaceTechProfiles,
} from "@/db/schema";
import type { DigestContentProvider } from "@/lib/email/digest/content";
import { siteOrigin } from "@/lib/email/services/send";
import type { GrowthDigestPayload } from "@/lib/email/types";
import { listPublicDocs } from "@/lib/docs/catalog";

const PRODUCT_UPDATE =
  "New: free homepage sandbox + npx moneygap-scan for crawlability, schema, and performance signals — then unlock Fix Paths™ in your dashboard.";

const FRAMEWORK_TIPS: Record<string, string> = {
  nextjs:
    "Next.js tip: ensure metadata, JSON-LD, and next/image dimensions ship on key templates to protect CLS and AI visibility.",
  next: "Next.js tip: ensure metadata, JSON-LD, and next/image dimensions ship on key templates to protect CLS and AI visibility.",
  react:
    "React tip: pair client-heavy pages with crawlable server HTML and stable heading structure for SEO/AEO.",
  astro:
    "Astro tip: keep content collections + sitemap generation in sync so new pages are discoverable quickly.",
  wordpress:
    "WordPress tip: verify XML sitemap plugins and schema blocks after theme updates — they often silently drop.",
};

function tipForFramework(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [k, tip] of Object.entries(FRAMEWORK_TIPS)) {
    if (key.includes(k)) return tip;
  }
  return `Framework tip: review crawlability and structured data for ${name} templates after each deploy.`;
}

export const ruleBasedDigestContent: DigestContentProvider = {
  async buildForUser({ userId, workspaceId, unsubscribeToken }) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user?.email) return null;

    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    });
    if (!membership) return null;

    const latestReports = await db.query.reports.findMany({
      where: eq(reports.workspaceId, workspaceId),
      orderBy: [desc(reports.createdAt)],
      limit: 2,
    });
    const latest = latestReports[0] ?? null;
    const previous = latestReports[1] ?? null;
    const score = latest?.moneyGapScore ?? null;
    const scoreDelta =
      score != null && previous?.moneyGapScore != null
        ? score - previous.moneyGapScore
        : null;

    let websiteName: string | null = null;
    let websiteUrl: string | null = null;
    if (latest?.websiteId) {
      const site = await db.query.websites.findFirst({
        where: eq(websites.id, latest.websiteId),
      });
      websiteName = site?.name ?? site?.domain ?? null;
      websiteUrl = site?.url ?? null;
    }

    const brief = await db.query.growthBriefs.findFirst({
      where: eq(growthBriefs.workspaceId, workspaceId),
      orderBy: [desc(growthBriefs.createdAt)],
    });

    const improvements = brief?.payload?.completed?.slice(0, 5) ?? [];
    const newIssues = brief?.payload?.newOps?.slice(0, 5) ?? [];
    const topRecommendation =
      latest?.opportunityIntelligence?.topRecommendations?.[0]?.title ??
      brief?.payload?.priorities?.[0] ??
      brief?.payload?.nextSteps?.[0] ??
      (score == null
        ? "Run your first website analysis to unlock Money Gaps™ and Fix Paths™."
        : "Review your highest Opportunity Index™ gap in Action Center.");

    const oiCount = latest?.opportunityIntelligence?.recommendationCount;
    const productUpdate =
      oiCount && oiCount > 0
        ? `Opportunity Intelligence™ found ${oiCount} growth opportunities on your latest scan — open Opportunity Intel in the dashboard.`
        : PRODUCT_UPDATE;

    let framework: string | null = null;
    const onboarding = await db.query.workspaceOnboarding.findFirst({
      where: eq(workspaceOnboarding.workspaceId, workspaceId),
    });
    framework = onboarding?.discoverySignals?.framework?.name ?? null;
    if (!framework) {
      const tech = await db.query.workspaceTechProfiles.findFirst({
        where: eq(workspaceTechProfiles.workspaceId, workspaceId),
      });
      framework = tech?.stack?.frontend ?? null;
    }

    const docs = listPublicDocs("product");
    const article = docs[0]
      ? {
          title: docs[0].title,
          href: `${siteOrigin()}/docs/${docs[0].slug}`,
        }
      : null;

    const origin = siteOrigin();
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email.split("@")[0] ||
      "there";

    const payload: GrowthDigestPayload = {
      recipientName: name,
      recipientEmail: user.email,
      score,
      scoreDelta,
      websiteName,
      websiteUrl,
      improvements,
      newIssues,
      topRecommendation,
      frameworkTip: tipForFramework(framework),
      docsArticle: article,
      productUpdate,
      reportId: latest?.id ?? null,
      cta: {
        analyzeHref: `${origin}/dashboard/analyze`,
        dashboardHref: `${origin}/dashboard/opportunity-intelligence`,
        reportHref: latest?.id ? `${origin}/reports/${latest.id}` : null,
      },
      unsubscribeHref: `${origin}/api/email/unsubscribe?token=${unsubscribeToken}`,
      preferencesHref: `${origin}/dashboard/settings/email`,
    };

    return payload;
  },
};
