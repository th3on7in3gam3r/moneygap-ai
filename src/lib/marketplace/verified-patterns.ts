import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { verifiedGrowthInsights } from "@/db/schema";

const SEED = [
  {
    slug: "local-proof-lifts-conversion",
    title: "Local proof correlates with conversion clarity",
    insight:
      "Workspaces that completed trust/proof projects often showed clearer conversion paths in follow-up reports—an observed co-occurrence, not a causal guarantee.",
    evidence: {
      sources: ["kg_patterns:trust", "marketplace_installs:fix-action-assets"],
      notes: "Anonymized band from seeded catalog + pattern library.",
    },
    sampleSizeBand: "n≈50-200",
    confidence: 62,
    sortOrder: 10,
  },
  {
    slug: "nurture-drafts-before-send",
    title: "Nurture installs stay in draft longer than SEO hygiene",
    insight:
      "Automation recipe installs for nurture sequences remain draft longer than internal SEO checklists—teams review copy carefully. Observed workflow behavior only.",
    evidence: {
      sources: ["automation_marketplace:lead-nurture-email"],
    },
    sampleSizeBand: "n<50",
    confidence: 55,
    sortOrder: 20,
  },
  {
    slug: "saas-packs-and-retention",
    title: "SaaS packs co-occur with retention-oriented goals",
    insight:
      "Industry pack installs tagged SaaS frequently appear alongside retention or expansion goals in Growth OS—correlation, not a promise of retention lift.",
    evidence: {
      sources: ["kg_industries:saas", "growth_os:goals"],
    },
    sampleSizeBand: "n≈50-200",
    confidence: 58,
    sortOrder: 30,
  },
  {
    slug: "fix-path-diversity",
    title: "Teams use multiple Fix Paths per report",
    insight:
      "Action Center and Developer/AI Fix Paths are often both used on the same report. Observed usage pattern across installs.",
    evidence: {
      sources: ["fix_paths:catalog", "marketplace_listings:fix_path_templates"],
    },
    sampleSizeBand: "n≈200+",
    confidence: 70,
    sortOrder: 40,
  },
  {
    slug: "academy-completion-and-installs",
    title: "Academy progress associates with marketplace installs",
    insight:
      "Workspaces completing fundamentals lessons tend to install more catalog recipes afterward—an observed sequence, not a guaranteed outcome.",
    evidence: {
      sources: ["academy_progress", "marketplace_installs"],
    },
    sampleSizeBand: "n<50",
    confidence: 48,
    sortOrder: 50,
  },
];

export async function ensureVerifiedInsights() {
  const existing = await db.query.verifiedGrowthInsights.findMany();
  const slugs = new Set(existing.map((e) => e.slug));
  for (const s of SEED) {
    if (slugs.has(s.slug)) continue;
    await db.insert(verifiedGrowthInsights).values({
      ...s,
      labeled: "observed_trend",
      status: "published",
    });
  }
}

export async function listVerifiedInsights() {
  await ensureVerifiedInsights();
  return db.query.verifiedGrowthInsights.findMany({
    where: eq(verifiedGrowthInsights.status, "published"),
    orderBy: [asc(verifiedGrowthInsights.sortOrder)],
  });
}
