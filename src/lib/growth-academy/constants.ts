import type { GaSectionType } from "@/db/schema";

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.APP_URL?.replace(/\/$/, "") ||
  "https://www.moneygap-ai.com";

export const GA_SECTIONS: {
  sectionType: GaSectionType;
  name: string;
  slug: string;
  description: string;
}[] = [
  {
    sectionType: "articles",
    name: "Articles",
    slug: "articles",
    description: "Practical growth writing for founders and marketers.",
  },
  {
    sectionType: "guides",
    name: "Guides",
    slug: "guides",
    description: "In-depth playbooks you can implement this week.",
  },
  {
    sectionType: "tutorials",
    name: "Tutorials",
    slug: "tutorials",
    description: "Step-by-step how-tos inside MoneyGap AI.",
  },
  {
    sectionType: "case_studies",
    name: "Case Studies",
    slug: "case-studies",
    description: "Customer outcomes and lessons learned.",
  },
  {
    sectionType: "insights",
    name: "Industry Insights",
    slug: "industry-insights",
    description: "Market context for growth and GEO.",
  },
  {
    sectionType: "seo",
    name: "SEO",
    slug: "seo",
    description: "Search visibility, topical authority, and indexing.",
  },
  {
    sectionType: "conversion",
    name: "Conversion Optimization",
    slug: "conversion-optimization",
    description: "Turn traffic into leads and revenue.",
  },
  {
    sectionType: "technical_seo",
    name: "Technical SEO",
    slug: "technical-seo",
    description: "Performance, crawlability, and site health.",
  },
  {
    sectionType: "ai",
    name: "AI",
    slug: "ai",
    description: "AI visibility, prompts, and automation.",
  },
  {
    sectionType: "marketing",
    name: "Marketing",
    slug: "marketing",
    description: "Acquisition systems that compound.",
  },
  {
    sectionType: "product_updates",
    name: "Product Updates",
    slug: "product-updates",
    description: "What shipped in MoneyGap AI.",
  },
  {
    sectionType: "release_notes",
    name: "Release Notes",
    slug: "release-notes",
    description: "Changelog-style product notes.",
  },
  {
    sectionType: "success_stories",
    name: "Success Stories",
    slug: "success-stories",
    description: "Wins from teams closing Money Gaps.",
  },
  {
    sectionType: "research",
    name: "Research",
    slug: "research",
    description: "Aggregated platform insights (labeled).",
  },
  {
    sectionType: "prompt_library",
    name: "AI Prompt Library",
    slug: "ai-prompt-library",
    description: "Copy-ready prompts for growth workflows.",
  },
];

export const DEFAULT_CONTENT_IDEAS: {
  title: string;
  summary: string;
  theme: string;
}[] = [
  {
    title: "Missing Meta Descriptions: The Quiet Conversion Leak",
    summary: "How thin meta descriptions hurt CTR and how to fix them at scale.",
    theme: "seo",
  },
  {
    title: "Backlink Strategy for Early-Stage SaaS",
    summary: "Authority plays that map to leads — not vanity Domains.",
    theme: "authority",
  },
  {
    title: "Technical SEO Checklist for Next.js Marketing Sites",
    summary: "Crawl, index, and Core Web Vitals proxies that matter.",
    theme: "technical_seo",
  },
  {
    title: "Conversion Optimization: CTA Hierarchy That Closes Gaps",
    summary: "Structure homepage and pricing CTAs around buyer intent.",
    theme: "conversion",
  },
  {
    title: "Schema Markup That Supports Trust and Rich Results",
    summary: "Organization, SoftwareApplication, FAQ, and Article patterns.",
    theme: "seo",
  },
  {
    title: "Core Web Vitals Without Vanity Scores",
    summary: "What to measure when CWV providers are not connected yet.",
    theme: "performance",
  },
  {
    title: "Trust Signals Buyers Expect Before They Convert",
    summary: "Proof, policy, and social validation patterns.",
    theme: "trust",
  },
  {
    title: "Buyer-Intent Content Strategy for GEO and AI Citations",
    summary: "Long-tail topics that capture decision-stage traffic.",
    theme: "content",
  },
];
