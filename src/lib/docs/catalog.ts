export type PublicDocCategory =
  | "start"
  | "product"
  | "privacy"
  | "platform"
  | "grow";

export type PublicDocEntry = {
  slug: string;
  title: string;
  summary: string;
  category: PublicDocCategory;
  order: number;
};

export const PUBLIC_DOC_CATEGORY_LABELS: Record<PublicDocCategory, string> = {
  start: "Getting started",
  product: "Product",
  privacy: "Privacy",
  platform: "Platform",
  grow: "Grow",
};

export const PUBLIC_DOC_CATALOG: PublicDocEntry[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Create a workspace, run your first analysis, and open a Fix Path™.",
    category: "start",
    order: 1,
  },
  {
    slug: "moneygap-score",
    title: "MoneyGap Score™",
    summary: "How the score works, category breakdowns, and what “better” looks like.",
    category: "product",
    order: 2,
  },
  {
    slug: "money-gaps-and-fix-paths",
    title: "Money Gaps™ and Fix Paths™",
    summary: "Named misses, AI Estimates, and reviewable Fix Paths™.",
    category: "product",
    order: 3,
  },
  {
    slug: "crawlability-score",
    title: "Crawlability Score™",
    summary: "Health signals for how crawlers and assistants can access your site.",
    category: "product",
    order: 4,
  },
  {
    slug: "privacy-smart-consent",
    title: "Privacy and Smart Consent™",
    summary: "Consent preferences, Privacy Center™, and Privacy Score™ basics.",
    category: "privacy",
    order: 5,
  },
  {
    slug: "ai-estimates",
    title: "AI Estimates and human review",
    summary: "What AI Estimates mean — and why MoneyGap never auto-publishes.",
    category: "product",
    order: 6,
  },
  {
    slug: "integrations",
    title: "Integrations",
    summary: "How connectors work, soft-fail behavior, and where to start.",
    category: "platform",
    order: 7,
  },
  {
    slug: "moneygap-api",
    title: "MoneyGap API™",
    summary:
      "API keys, /api/v1 endpoints, webhooks, OpenAPI, and curl quickstarts.",
    category: "platform",
    order: 8,
  },
  {
    slug: "growth-badge",
    title: "Growth Badge™",
    summary: "Create, embed, and verify a branded Growth Badge™ for your site.",
    category: "grow",
    order: 9,
  },
  {
    slug: "browser-extension",
    title: "Browser Extension (Coming Soon)",
    summary: "Waitlist for the Chrome extension — live-page scans and Fix Path™ shares.",
    category: "grow",
    order: 10,
  },
  {
    slug: "growth-academy",
    title: "Growth Academy™",
    summary: "Educational playbooks that map to Fix Paths™ and live gaps.",
    category: "grow",
    order: 11,
  },
  {
    slug: "programmatic-fix-paths",
    title: "Programmatic Fix Paths™",
    summary: "CLI, API, and CI-oriented ways to close top Money Gaps™.",
    category: "platform",
    order: 12,
  },
];

export function listPublicDocs(category?: string | null): PublicDocEntry[] {
  const sorted = [...PUBLIC_DOC_CATALOG].sort((a, b) => a.order - b.order);
  if (!category) return sorted;
  return sorted.filter((d) => d.category === category);
}

export function getPublicDoc(slug: string): PublicDocEntry | undefined {
  return PUBLIC_DOC_CATALOG.find((d) => d.slug === slug);
}

export function getPublicDocNeighbors(slug: string): {
  prev: PublicDocEntry | null;
  next: PublicDocEntry | null;
} {
  const sorted = listPublicDocs();
  const i = sorted.findIndex((d) => d.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? sorted[i - 1]! : null,
    next: i < sorted.length - 1 ? sorted[i + 1]! : null,
  };
}

export function publicDocsByCategory(): {
  category: PublicDocCategory;
  label: string;
  docs: PublicDocEntry[];
}[] {
  const order: PublicDocCategory[] = [
    "start",
    "product",
    "privacy",
    "platform",
    "grow",
  ];
  return order
    .map((category) => ({
      category,
      label: PUBLIC_DOC_CATEGORY_LABELS[category],
      docs: listPublicDocs(category),
    }))
    .filter((g) => g.docs.length > 0);
}
