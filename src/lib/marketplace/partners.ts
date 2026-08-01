import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { marketplacePartners } from "@/db/schema";

const SEED_PARTNERS = [
  {
    slug: "northstar-agency",
    name: "Northstar Growth Agency",
    type: "agency",
    website: "https://example.com/northstar",
    blurb: "Agency partner specializing in local and SaaS growth systems.",
    verified: true,
    sortOrder: 10,
  },
  {
    slug: "stackforge-dev",
    name: "Stackforge Developers",
    type: "developer",
    website: "https://example.com/stackforge",
    blurb: "Builds Fix Path blueprints and Developer Mode integrations.",
    verified: true,
    sortOrder: 20,
  },
  {
    slug: "relay-integrators",
    name: "Relay Integrators",
    type: "integrator",
    website: "https://example.com/relay",
    blurb: "CRM and ESP connection specialists for Integration Hub™.",
    verified: false,
    sortOrder: 30,
  },
  {
    slug: "growth-lab-edu",
    name: "Growth Lab Education",
    type: "educator",
    website: "https://example.com/growth-lab",
    blurb: "Courses and workshops aligned with Growth Academy™.",
    verified: true,
    sortOrder: 40,
  },
];

export async function ensurePartners() {
  const existing = await db.query.marketplacePartners.findMany();
  const slugs = new Set(existing.map((p) => p.slug));
  for (const p of SEED_PARTNERS) {
    if (slugs.has(p.slug)) continue;
    await db.insert(marketplacePartners).values(p);
  }
}

export async function listPartners() {
  await ensurePartners();
  return db.query.marketplacePartners.findMany({
    where: eq(marketplacePartners.status, "active"),
    orderBy: [asc(marketplacePartners.sortOrder)],
  });
}
