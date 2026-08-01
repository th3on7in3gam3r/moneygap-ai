/** Curated Documentation Center catalog (in-app index of /docs). */

export type DocCatalogEntry = {
  slug: string;
  title: string;
  summary: string;
  category: "product" | "platform" | "security" | "grow";
  path: string;
};

export const DOC_CATALOG: DocCatalogEntry[] = [
  {
    slug: "vision",
    title: "Vision",
    summary: "Mission, growth chain, product layers.",
    category: "product",
    path: "docs/vision.md",
  },
  {
    slug: "platform-1.0",
    title: "Platform 1.0™",
    summary: "Launch readiness modules and soft-fail rules.",
    category: "platform",
    path: "docs/platform-1.0.md",
  },
  {
    slug: "security",
    title: "Security",
    summary: "MFA (Clerk), rate limits, isolation, webhooks, secrets.",
    category: "security",
    path: "docs/security.md",
  },
  {
    slug: "operations",
    title: "Operations",
    summary: "Health, system dashboard, crons, rollback.",
    category: "platform",
    path: "docs/operations.md",
  },
  {
    slug: "public-api",
    title: "Public API",
    summary: "Launch guide for /api/v1 and Developer Hub.",
    category: "platform",
    path: "docs/public-api.md",
  },
  {
    slug: "customer-success",
    title: "Customer Success",
    summary: "Onboarding, help, and Documentation Center.",
    category: "grow",
    path: "docs/customer-success.md",
  },
  {
    slug: "production-checklist",
    title: "Production checklist",
    summary: "Deploy, security, monitoring, rollback.",
    category: "platform",
    path: "docs/production-checklist.md",
  },
  {
    slug: "monetization",
    title: "Monetization",
    summary: "Plans, entitlements, Stripe soft-enable.",
    category: "platform",
    path: "docs/monetization.md",
  },
  {
    slug: "api-platform",
    title: "API Platform",
    summary: "Keys, scopes, webhooks, rate limits.",
    category: "platform",
    path: "docs/api-platform.md",
  },
  {
    slug: "trust-engine",
    title: "Trust Engine™",
    summary: "Evidence, confidence, production trust pass.",
    category: "product",
    path: "docs/trust-engine.md",
  },
  {
    slug: "marketplace",
    title: "Marketplace™",
    summary: "Catalog, packs, academy, verified patterns.",
    category: "grow",
    path: "docs/marketplace.md",
  },
  {
    slug: "team-workspace",
    title: "Team Workspace™",
    summary: "Invites, Client role, collaboration.",
    category: "grow",
    path: "docs/team-workspace.md",
  },
  {
    slug: "growth-academy",
    title: "Growth Academy™",
    summary: "Public content hub, SEO, and editorial CMS.",
    category: "grow",
    path: "docs/growth-academy.md",
  },
  {
    slug: "blog-cms",
    title: "Blog CMS",
    summary: "Draft, preview, publish, versions, idea queue.",
    category: "grow",
    path: "docs/blog-cms.md",
  },
  {
    slug: "ai-publishing",
    title: "AI Publishing Engine™",
    summary: "Draft-only AI article generation for editors.",
    category: "grow",
    path: "docs/ai-publishing.md",
  },
];

export function listDocCatalog(category?: string | null) {
  if (!category) return DOC_CATALOG;
  return DOC_CATALOG.filter((d) => d.category === category);
}
