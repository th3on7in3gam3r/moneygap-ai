import type { EffortEstimate, RecommendationPriority } from "../types.js";

/** Bump when adding/changing rule semantics (extensible without architecture rewrite). */
export const RULESET_VERSION = "1.0.0";

export type RuleDef = {
  id: string;
  section?: string;
  severity: RecommendationPriority;
  weight: number;
  title: string;
  impact: string;
  why: string;
  action: string;
  effort: EffortEstimate;
};

/** Required / recommended llms.txt section headings (case-insensitive match). */
export const LLMS_SECTIONS = [
  "Organization",
  "Summary",
  "Products",
  "Services",
  "Target Audience",
  "Important URLs",
  "Documentation",
  "Knowledge Base",
  "FAQ",
  "Support",
  "Contact",
  "Preferred Canonical Resources",
  "Update Information",
] as const;

export const RULES: RuleDef[] = [
  {
    id: "llms/missing-file",
    severity: "high",
    weight: 28,
    title: "Create llms.txt",
    impact: "Improve AI discoverability and machine understanding.",
    why: "AI systems have no dedicated guidance document describing your organization and primary resources.",
    action: "Publish /llms.txt (or public/llms.txt) with organization, summary, and canonical URLs.",
    effort: "low",
  },
  {
    id: "llms/empty-file",
    severity: "high",
    weight: 24,
    title: "Expand empty llms.txt",
    impact: "Thin guidance files are ignored by AI crawlers.",
    why: "File exists but has insufficient content for assistants to ground the brand.",
    action: "Fill required sections using moneygap generate llms or the AI Readiness dashboard.",
    effort: "low",
  },
  {
    id: "llms/missing-organization",
    section: "Organization",
    severity: "high",
    weight: 10,
    title: "Add Organization section",
    impact: "Clear entity naming for AI assistants.",
    why: "Without an Organization heading, crawlers may mis-attribute the brand.",
    action: "Add `# Organization` with the legal or product brand name.",
    effort: "low",
  },
  {
    id: "llms/missing-summary",
    section: "Summary",
    severity: "high",
    weight: 10,
    title: "Add Summary section",
    impact: "Assistants need a short product narrative.",
    why: "Missing summary reduces extractable positioning.",
    action: "Add `# Summary` with 2–4 sentences describing what you do.",
    effort: "low",
  },
  {
    id: "llms/missing-products",
    section: "Products",
    severity: "medium",
    weight: 6,
    title: "Document Products",
    impact: "Product inventory helps answer-engine grounding.",
    why: "No products section for machine-readable offerings.",
    action: "List primary products under `# Products`.",
    effort: "low",
  },
  {
    id: "llms/missing-services",
    section: "Services",
    severity: "medium",
    weight: 4,
    title: "Document Services",
    impact: "Service clarity for B2B assistants.",
    why: "Services section missing or empty.",
    action: "Add `# Services` or note N/A if product-only.",
    effort: "low",
  },
  {
    id: "llms/missing-audience",
    section: "Target Audience",
    severity: "medium",
    weight: 5,
    title: "Clarify Target Audience",
    impact: "Better match to buyer/assistant queries.",
    why: "Audience is unspecified.",
    action: "Add `# Target Audience` with ICP bullets.",
    effort: "low",
  },
  {
    id: "llms/missing-important-urls",
    section: "Important URLs",
    severity: "high",
    weight: 8,
    title: "List Important URLs",
    impact: "Canonical entry points for AI crawlers.",
    why: "No primary URL inventory.",
    action: "Add `# Important URLs` with absolute https links.",
    effort: "low",
  },
  {
    id: "llms/missing-documentation",
    section: "Documentation",
    severity: "medium",
    weight: 5,
    title: "Link Documentation",
    impact: "Docs improve answer quality from assistants.",
    why: "Documentation section missing.",
    action: "Add `# Documentation` with docs/help URLs.",
    effort: "low",
  },
  {
    id: "llms/missing-knowledge",
    section: "Knowledge Base",
    severity: "low",
    weight: 3,
    title: "Link Knowledge Base",
    impact: "Deeper topical coverage for AI systems.",
    why: "Knowledge Base section missing.",
    action: "Add `# Knowledge Base` with blog/academy/help articles.",
    effort: "low",
  },
  {
    id: "llms/missing-faq",
    section: "FAQ",
    severity: "medium",
    weight: 5,
    title: "Reference FAQ",
    impact: "FAQ grounding for answer engines.",
    why: "FAQ section missing.",
    action: "Add `# FAQ` with link to FAQ page or inline Q&A.",
    effort: "low",
  },
  {
    id: "llms/missing-support",
    section: "Support",
    severity: "medium",
    weight: 4,
    title: "Add Support links",
    impact: "Transparent escalation for humans and agents.",
    why: "Support section missing.",
    action: "Add `# Support` with help desk or email.",
    effort: "low",
  },
  {
    id: "llms/missing-contact",
    section: "Contact",
    severity: "medium",
    weight: 4,
    title: "Add Contact information",
    impact: "Contact transparency builds trust for AI citations.",
    why: "Contact section missing.",
    action: "Add `# Contact` with a public contact URL or email.",
    effort: "low",
  },
  {
    id: "llms/missing-canonicals",
    section: "Preferred Canonical Resources",
    severity: "medium",
    weight: 5,
    title: "Declare Preferred Canonical Resources",
    impact: "Reduce hallucinated URLs in AI answers.",
    why: "No preferred canonical resource list.",
    action: "Add `# Preferred Canonical Resources` with absolute URLs.",
    effort: "low",
  },
  {
    id: "llms/missing-update-info",
    section: "Update Information",
    severity: "low",
    weight: 2,
    title: "Add Update Information",
    impact: "Freshness signal for crawlers.",
    why: "No update/last-reviewed date.",
    action: "Add `# Update Information` with last-updated ISO date.",
    effort: "low",
  },
  {
    id: "llms/no-https-links",
    severity: "medium",
    weight: 6,
    title: "Include absolute https URLs",
    impact: "Relative or missing links are hard for AI crawlers to resolve.",
    why: "No absolute https:// links detected in llms.txt.",
    action: "Use full https:// URLs for important, docs, and canonical resources.",
    effort: "low",
  },
];

export function ruleById(id: string): RuleDef | undefined {
  return RULES.find((r) => r.id === id);
}
