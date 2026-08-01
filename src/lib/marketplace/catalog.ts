import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  marketplaceCreators,
  marketplaceInstalls,
  marketplaceListings,
  marketplaceRevenueEvents,
  marketplaceReviews,
  type MarketplaceCategory,
  type MarketplaceListingPayload,
} from "@/db/schema";
import { installMarketplaceTemplate } from "@/lib/automation/marketplace";
import { FIX_PATH_CATALOG } from "@/lib/fix-paths/catalog";
import { isMarketplaceEnabled } from "@/lib/marketplace/flag";

const MONEY_GAP_CREATOR = {
  displayName: "MoneyGap AI",
  bio: "Official curated growth solutions.",
  verified: true,
  revenueShareBps: 10000,
};

type SeedListing = {
  slug: string;
  title: string;
  category: MarketplaceCategory;
  kind:
    | "ai_agent"
    | "industry_pack"
    | "growth_playbook"
    | "automation_recipe"
    | "dashboard_widget"
    | "reporting_template"
    | "blueprint_collection"
    | "fix_path_template";
  summary: string;
  payload: MarketplaceListingPayload;
  sortOrder: number;
};

const SEED_LISTINGS: SeedListing[] = [
  {
    slug: "recipe-lead-nurture-email",
    title: "Lead nurture email sequence",
    category: "automation_recipes",
    kind: "automation_recipe",
    summary: "Draft 5-touch nurture workflow (no auto-send).",
    payload: { automationTemplateSlug: "lead-nurture-email", agentSlug: "marketing" },
    sortOrder: 10,
  },
  {
    slug: "recipe-review-request",
    title: "Review request loop",
    category: "automation_recipes",
    kind: "automation_recipe",
    summary: "Ask happy customers for reviews after delivery.",
    payload: { automationTemplateSlug: "review-request", agentSlug: "trust" },
    sortOrder: 20,
  },
  {
    slug: "recipe-crm-lead-capture",
    title: "CRM lead capture stages",
    category: "automation_recipes",
    kind: "automation_recipe",
    summary: "Map new leads into CRM stages without live sync.",
    payload: { automationTemplateSlug: "crm-lead-capture", agentSlug: "revenue" },
    sortOrder: 30,
  },
  {
    slug: "agent-marketing",
    title: "Marketing Agent",
    category: "ai_agents",
    kind: "ai_agent",
    summary: "AI Workforce™ marketing specialist for campaigns and nurture drafts.",
    payload: { agentSlug: "marketing", href: "/dashboard/automation" },
    sortOrder: 40,
  },
  {
    slug: "agent-seo",
    title: "SEO Agent",
    category: "ai_agents",
    kind: "ai_agent",
    summary: "SEO hygiene and discovery workflows.",
    payload: { agentSlug: "seo", href: "/dashboard/automation" },
    sortOrder: 50,
  },
  {
    slug: "pack-restaurant",
    title: "Restaurant Industry Pack",
    category: "industry_packs",
    kind: "industry_pack",
    summary: "KG industry intelligence for restaurants and hospitality.",
    payload: {
      kgIndustrySlug: "restaurant",
      href: "/dashboard/knowledge?industry=restaurant",
    },
    sortOrder: 60,
  },
  {
    slug: "pack-saas",
    title: "SaaS Industry Pack",
    category: "industry_packs",
    kind: "industry_pack",
    summary: "KG industry intelligence for SaaS growth loops.",
    payload: { kgIndustrySlug: "saas", href: "/dashboard/knowledge?industry=saas" },
    sortOrder: 70,
  },
  {
    slug: "playbook-local-authority",
    title: "Local authority playbook",
    category: "growth_playbooks",
    kind: "growth_playbook",
    summary: "Growth Pattern Library™ playbook for local trust and discovery.",
    payload: {
      kgPlaybookSlug: "local-authority",
      href: "/dashboard/knowledge",
    },
    sortOrder: 80,
  },
  {
    slug: "fix-action-assets",
    title: "Build with Action Center",
    category: "fix_path_templates",
    kind: "fix_path_template",
    summary: FIX_PATH_CATALOG.find((p) => p.id === "action_assets")?.description ?? "",
    payload: { fixPathId: "action_assets" },
    sortOrder: 90,
  },
  {
    slug: "fix-developer-ai",
    title: "Code + AI Fix Path",
    category: "fix_path_templates",
    kind: "fix_path_template",
    summary: FIX_PATH_CATALOG.find((p) => p.id === "developer_ai")?.description ?? "",
    payload: {
      fixPathId: "developer_ai",
      href: "/dashboard/ide-prompt",
    },
    sortOrder: 100,
  },
  {
    slug: "fix-automation",
    title: "Automation Fix Path",
    category: "fix_path_templates",
    kind: "fix_path_template",
    summary: FIX_PATH_CATALOG.find((p) => p.id === "automation")?.description ?? "",
    payload: { fixPathId: "automation", href: "/dashboard/automation" },
    sortOrder: 110,
  },
  {
    slug: "widget-today-focus",
    title: "Today Focus widget",
    category: "dashboard_widgets",
    kind: "dashboard_widget",
    summary: "Pin Growth OS™ Today Focus concepts to your workspace overview.",
    payload: { widgetId: "today_focus", href: "/dashboard" },
    sortOrder: 120,
  },
  {
    slug: "report-executive-brief",
    title: "Executive briefing template",
    category: "reporting_templates",
    kind: "reporting_template",
    summary: "Leadership rollup template composing Executive AI Briefing™.",
    payload: { reportTemplateId: "executive_briefing", href: "/dashboard/executive" },
    sortOrder: 130,
  },
  {
    slug: "blueprint-ide-prompt-pack",
    title: "IDE Prompt blueprint collection",
    category: "blueprint_collections",
    kind: "blueprint_collection",
    summary: "Developer Mode™ IDE prompt blueprints for common gaps.",
    payload: { href: "/dashboard/ide-prompt", notes: "Open IDE Prompt with an opportunity." },
    sortOrder: 140,
  },
];

export async function ensureMarketplaceCatalog() {
  if (!isMarketplaceEnabled()) return;

  let creator = await db.query.marketplaceCreators.findFirst({
    where: eq(marketplaceCreators.displayName, MONEY_GAP_CREATOR.displayName),
  });
  if (!creator) {
    const [row] = await db
      .insert(marketplaceCreators)
      .values(MONEY_GAP_CREATOR)
      .returning();
    creator = row;
  }

  const existing = await db.query.marketplaceListings.findMany();
  const bySlug = new Set(existing.map((e) => e.slug));
  for (const seed of SEED_LISTINGS) {
    if (bySlug.has(seed.slug)) continue;
    await db.insert(marketplaceListings).values({
      ...seed,
      creatorId: creator!.id,
      status: "published",
      priceCents: 0,
    });
  }
}

export async function listListings(input?: {
  category?: MarketplaceCategory | null;
  q?: string | null;
}) {
  await ensureMarketplaceCatalog();
  const rows = await db.query.marketplaceListings.findMany({
    where: eq(marketplaceListings.status, "published"),
    orderBy: [asc(marketplaceListings.sortOrder)],
    with: { creator: true },
  });
  let filtered = rows;
  if (input?.category) {
    filtered = filtered.filter((r) => r.category === input.category);
  }
  if (input?.q?.trim()) {
    const q = input.q.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.slug.includes(q),
    );
  }
  return filtered;
}

export async function getListingBySlug(slug: string) {
  await ensureMarketplaceCatalog();
  return db.query.marketplaceListings.findFirst({
    where: eq(marketplaceListings.slug, slug),
    with: { creator: true, reviews: true },
  });
}

export async function installListing(input: {
  workspaceId: string;
  userId: string;
  listingIdOrSlug: string;
}) {
  await ensureMarketplaceCatalog();
  const listing =
    (await db.query.marketplaceListings.findFirst({
      where: eq(marketplaceListings.id, input.listingIdOrSlug),
    })) ??
    (await db.query.marketplaceListings.findFirst({
      where: eq(marketplaceListings.slug, input.listingIdOrSlug),
    }));

  if (!listing || listing.status !== "published") {
    return { ok: false as const, status: 404 as const, error: "Listing not found" };
  }
  if (listing.priceCents > 0) {
    return {
      ok: false as const,
      status: 402 as const,
      error: "Paid listings checkout is not available yet",
    };
  }

  const resultRef: Record<string, unknown> = {
    kind: listing.kind,
    payload: listing.payload,
  };

  if (listing.payload.automationTemplateSlug) {
    const installed = await installMarketplaceTemplate({
      workspaceId: input.workspaceId,
      slug: listing.payload.automationTemplateSlug,
    });
    if (!installed.ok) {
      return {
        ok: false as const,
        status: installed.status,
        error: installed.error,
      };
    }
    resultRef.workflowId = installed.workflow.id;
    resultRef.href = "/dashboard/automation";
  } else if (listing.payload.href) {
    resultRef.href = listing.payload.href;
  } else if (listing.payload.fixPathId) {
    resultRef.href = "/dashboard";
    resultRef.fixPathId = listing.payload.fixPathId;
  } else if (listing.payload.kgIndustrySlug) {
    resultRef.href = `/dashboard/knowledge?industry=${encodeURIComponent(listing.payload.kgIndustrySlug)}`;
  }

  const [install] = await db
    .insert(marketplaceInstalls)
    .values({
      workspaceId: input.workspaceId,
      listingId: listing.id,
      installedByUserId: input.userId,
      resultRef,
    })
    .returning();

  await db
    .update(marketplaceListings)
    .set({
      installCount: sql`${marketplaceListings.installCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceListings.id, listing.id));

  // Stub revenue attribution for analytics (free = $0 AI Estimate)
  await db.insert(marketplaceRevenueEvents).values({
    listingId: listing.id,
    workspaceId: input.workspaceId,
    amountCents: 0,
    shareBps: 7000,
    labeled: "AI Estimate",
  });

  return {
    ok: true as const,
    install,
    listing,
    resultRef,
    event: "listing.installed" as const,
  };
}

export async function upsertReview(input: {
  workspaceId: string;
  userId: string;
  listingId: string;
  rating: number;
  body?: string | null;
}) {
  if (input.rating < 1 || input.rating > 5) {
    return { ok: false as const, status: 400 as const, error: "Rating 1–5 required" };
  }

  const listing = await db.query.marketplaceListings.findFirst({
    where: eq(marketplaceListings.id, input.listingId),
  });
  if (!listing) {
    return { ok: false as const, status: 404 as const, error: "Listing not found" };
  }

  const existing = await db.query.marketplaceReviews.findFirst({
    where: and(
      eq(marketplaceReviews.workspaceId, input.workspaceId),
      eq(marketplaceReviews.listingId, input.listingId),
    ),
  });

  let review;
  if (existing) {
    const [row] = await db
      .update(marketplaceReviews)
      .set({
        rating: input.rating,
        body: input.body?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceReviews.id, existing.id))
      .returning();
    review = row;
  } else {
    const [row] = await db
      .insert(marketplaceReviews)
      .values({
        listingId: input.listingId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        rating: input.rating,
        body: input.body?.trim() || null,
      })
      .returning();
    review = row;
  }

  const all = await db.query.marketplaceReviews.findMany({
    where: eq(marketplaceReviews.listingId, input.listingId),
  });
  const avg =
    all.length === 0
      ? 0
      : Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10);

  await db
    .update(marketplaceListings)
    .set({
      ratingAvg: avg,
      ratingCount: all.length,
      updatedAt: new Date(),
    })
    .where(eq(marketplaceListings.id, input.listingId));

  return { ok: true as const, review, event: "review.created" as const };
}

export async function getMarketplaceAnalytics(workspaceId: string) {
  const installs = await db.query.marketplaceInstalls.findMany({
    where: eq(marketplaceInstalls.workspaceId, workspaceId),
    orderBy: [desc(marketplaceInstalls.createdAt)],
    with: { listing: true },
    limit: 50,
  });
  const revenue = await db.query.marketplaceRevenueEvents.findMany({
    where: eq(marketplaceRevenueEvents.workspaceId, workspaceId),
    orderBy: [desc(marketplaceRevenueEvents.createdAt)],
    limit: 50,
  });
  const published = await db.query.marketplaceListings.findMany({
    where: eq(marketplaceListings.status, "published"),
  });

  return {
    workspaceInstalls: installs.length,
    recentInstalls: installs,
    revenueEvents: revenue,
    catalogStats: {
      listings: published.length,
      totalInstalls: published.reduce((s, l) => s + l.installCount, 0),
      avgRatingTenths:
        published.length === 0
          ? 0
          : Math.round(
              published.reduce((s, l) => s + l.ratingAvg, 0) / published.length,
            ),
    },
    labeled: "AI Estimate" as const,
  };
}
