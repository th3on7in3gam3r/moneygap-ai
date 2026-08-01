import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencyTemplates } from "@/db/schema";

const SEED_TEMPLATES = [
  {
    slug: "restaurant-growth-audit",
    name: "Restaurant Growth Audit",
    modulePriority: ["conversion", "trust", "marketing", "content", "seo"],
    reportSections: ["opportunities", "trust", "content", "competitive"],
    recommendationHints:
      "Prioritize reviews, reservations, local SEO, menu clarity, and repeat-visit offers.",
    priorityNotes: "Local discovery and trust convert diners.",
  },
  {
    slug: "ecommerce-growth-audit",
    name: "Ecommerce Growth Audit",
    modulePriority: ["conversion", "revenue", "marketing", "seo", "customer"],
    reportSections: ["opportunities", "competitive", "content"],
    recommendationHints:
      "Focus on PDP conversion, email/SMS capture, shipping trust, and product content.",
    priorityNotes: "Cart recovery and offer clarity usually win first.",
  },
  {
    slug: "local-business-audit",
    name: "Local Business Audit",
    modulePriority: ["seo", "trust", "conversion", "marketing"],
    reportSections: ["opportunities", "trust", "audience"],
    recommendationHints:
      "Google Business Profile, reviews, service-area pages, and clear CTAs.",
    priorityNotes: "Local intent + proof beats broad brand content.",
  },
  {
    slug: "saas-growth-audit",
    name: "SaaS Growth Audit",
    modulePriority: ["conversion", "content", "authority", "marketing", "ai"],
    reportSections: ["opportunities", "competitive", "content"],
    recommendationHints:
      "Trial friction, pricing clarity, comparison pages, and product-led content.",
    priorityNotes: "Activation and differentiation first.",
  },
  {
    slug: "nonprofit-growth-audit",
    name: "Nonprofit Growth Audit",
    modulePriority: ["trust", "conversion", "content", "marketing"],
    reportSections: ["opportunities", "trust", "audience"],
    recommendationHints:
      "Donation UX, impact stories, recurring giving, and volunteer CTAs.",
    priorityNotes: "Trust and impact narrative drive gifts.",
  },
  {
    slug: "church-growth-audit",
    name: "Church Growth Audit",
    modulePriority: ["trust", "content", "conversion", "marketing"],
    reportSections: ["opportunities", "trust", "audience", "content"],
    recommendationHints:
      "Service times clarity, visitor pathways, giving, and community content.",
    priorityNotes: "First-visit clarity and belonging signals matter most.",
  },
] as const;

export async function ensureAgencyTemplatesSeeded() {
  for (const t of SEED_TEMPLATES) {
    const existing = await db.query.agencyTemplates.findFirst({
      where: eq(agencyTemplates.slug, t.slug),
    });
    if (!existing) {
      await db.insert(agencyTemplates).values({
        slug: t.slug,
        name: t.name,
        modulePriority: [...t.modulePriority],
        reportSections: [...t.reportSections],
        recommendationHints: t.recommendationHints,
        priorityNotes: t.priorityNotes,
      });
    }
  }
}

export async function listAgencyTemplates() {
  await ensureAgencyTemplatesSeeded();
  return db.query.agencyTemplates.findMany();
}
