import {
  computeOpportunityScore,
  difficultyToEffort,
  impactToValue,
} from "@/lib/opportunity-intelligence/scoring/opportunity-score";
import type {
  CustomerQuestion,
  ImpactLevel,
  KeywordCluster,
  OiRecommendationDraft,
  OiRecommendationKind,
  SemanticEntity,
} from "@/lib/opportunity-intelligence/types";

const DEV_DOCS = [
  { label: "Developer Hub", href: "/dashboard/developers" },
  { label: "Docs", href: "/dashboard/docs" },
  { label: "AI Readiness", href: "/dashboard/ai-readiness" },
];

function scored(
  partial: Omit<OiRecommendationDraft, "opportunityScore" | "factors" | "priority"> & {
    businessImpact: ImpactLevel;
    seoImpact: ImpactLevel;
    aiReadinessImpact: ImpactLevel;
    difficulty: string;
    demandProxy?: number;
    competition?: number;
  },
): OiRecommendationDraft {
  const factors = {
    businessValue: impactToValue(partial.businessImpact),
    revenuePotential: impactToValue(partial.businessImpact) * 0.9,
    searchDemand: partial.demandProxy ?? 0.45,
    competition: partial.competition ?? 0.5,
    implementationEffort: difficultyToEffort(partial.difficulty),
    aiVisibility: impactToValue(partial.aiReadinessImpact),
    topicalAuthority: impactToValue(partial.seoImpact),
  };
  const opportunityScore = computeOpportunityScore(factors);
  return {
    ...partial,
    factors,
    opportunityScore,
    priority: opportunityScore,
    implementationLinks: partial.implementationLinks?.length
      ? partial.implementationLinks
      : DEV_DOCS,
  };
}

const EXPECTED_PAGE_TYPES: {
  type: string;
  title: string;
  kind: OiRecommendationKind;
  businessImpact: ImpactLevel;
}[] = [
  { type: "pricing", title: "Create a Pricing page", kind: "missing_landing_page", businessImpact: "high" },
  { type: "faq", title: "Create an FAQ page", kind: "missing_faq", businessImpact: "medium" },
  { type: "about", title: "Strengthen About / trust page", kind: "missing_page", businessImpact: "medium" },
  { type: "blog", title: "Launch or expand educational blog", kind: "missing_guide", businessImpact: "medium" },
  { type: "services", title: "Expand service landing pages", kind: "missing_service", businessImpact: "high" },
  { type: "contact", title: "Clarify contact / conversion path", kind: "missing_page", businessImpact: "high" },
];

export function buildRecommendations(input: {
  pageTypes: string[];
  services: string[];
  products: string[];
  monetizationMissing: string[];
  questions: CustomerQuestion[];
  entitiesRecommended: SemanticEntity[];
  clusters: KeywordCluster[];
  competitorGapTitles: string[];
  hasFaqSchemaHint: boolean;
  hasLlmsTxtHint: boolean;
}): OiRecommendationDraft[] {
  const types = new Set(input.pageTypes.map((t) => t.toLowerCase()));
  const recs: OiRecommendationDraft[] = [];

  for (const expected of EXPECTED_PAGE_TYPES) {
    if (types.has(expected.type)) continue;
    recs.push(
      scored({
        kind: expected.kind,
        title: expected.title,
        summary: `Your crawl did not detect a clear ${expected.type} page. Adding one closes a coverage gap competitors often monetize.`,
        whyItMatters:
          "Missing foundational pages reduce conversion clarity, topical coverage, and AI citation readiness.",
        businessImpact: expected.businessImpact,
        seoImpact: "high",
        aiReadinessImpact: expected.type === "faq" ? "high" : "medium",
        difficulty: "medium",
        estimatedTime: expected.type === "faq" ? "3–5 days" : "1–2 weeks",
        dependencies: [],
        nextSteps: [
          `Outline ${expected.type} page goals and CTA`,
          "Draft copy aligned to primary services",
          "Add schema and internal links from homepage",
        ],
        implementationLinks: DEV_DOCS,
      }),
    );
  }

  for (const missing of input.monetizationMissing.slice(0, 4)) {
    recs.push(
      scored({
        kind: "missing_service",
        title: `Surface monetization: ${missing}`,
        summary: `Intelligence flagged “${missing}” as missing from visible monetization.`,
        whyItMatters:
          "Hidden or absent offers leave revenue on the table and confuse both buyers and AI assistants.",
        businessImpact: "high",
        seoImpact: "medium",
        aiReadinessImpact: "medium",
        difficulty: "medium",
        estimatedTime: "1 week",
        dependencies: [],
        nextSteps: [
          `Define packaging for ${missing}`,
          "Add a dedicated landing section or page",
          "Link from pricing and homepage",
        ],
        implementationLinks: DEV_DOCS,
      }),
    );
  }

  for (const svc of input.services.slice(0, 3)) {
    const hasLanding = input.pageTypes.some((p) =>
      p.toLowerCase().includes("service"),
    );
    if (hasLanding) continue;
    recs.push(
      scored({
        kind: "missing_landing_page",
        title: `Dedicated landing page for ${svc}`,
        summary: `Create a service page that owns the ${svc} topic cluster.`,
        whyItMatters:
          "Service-specific pages convert better and give AI systems clear entities to cite.",
        businessImpact: "high",
        seoImpact: "high",
        aiReadinessImpact: "high",
        difficulty: "medium",
        estimatedTime: "1–2 weeks",
        dependencies: [],
        nextSteps: [
          "Map customer questions to H2s",
          "Add FAQ + schema",
          "Internal-link from related guides",
        ],
        implementationLinks: DEV_DOCS,
        demandProxy: 0.65,
      }),
    );
  }

  const faqQs = input.questions.filter((q) => q.suggestFaq).slice(0, 5);
  if (faqQs.length && !types.has("faq")) {
    recs.push(
      scored({
        kind: "missing_faq",
        title: "Publish FAQ covering high-intent customer questions",
        summary: `Customers are likely asking: ${faqQs
          .slice(0, 3)
          .map((q) => q.question)
          .join(" · ")}`,
        whyItMatters:
          "FAQs capture long-tail demand, reduce sales friction, and improve AI answerability.",
        businessImpact: "medium",
        seoImpact: "high",
        aiReadinessImpact: "high",
        difficulty: "easy",
        estimatedTime: "2–4 days",
        dependencies: [],
        nextSteps: [
          "Select top 8–12 questions",
          "Add FAQPage schema",
          "Link from service pages",
        ],
        implementationLinks: DEV_DOCS,
        demandProxy: 0.7,
      }),
    );
  }

  for (const guideQ of input.questions.filter((q) => q.suggestGuide).slice(0, 3)) {
    recs.push(
      scored({
        kind: "missing_guide",
        title: `Guide: ${guideQ.question.replace(/\?$/, "")}`,
        summary: "Turn this high-value question into an authoritative guide.",
        whyItMatters:
          "Guides build topical authority and feed both organic search and AI assistants.",
        businessImpact: "medium",
        seoImpact: "high",
        aiReadinessImpact: "high",
        difficulty: "medium",
        estimatedTime: "1–2 weeks",
        dependencies: [],
        nextSteps: [
          "Outline H2 structure",
          "Add examples and CTAs",
          "Internally link related services",
        ],
        implementationLinks: DEV_DOCS,
        intent: guideQ.intent,
        demandProxy: 0.55,
      }),
    );
  }

  if (!input.hasFaqSchemaHint) {
    recs.push(
      scored({
        kind: "missing_schema",
        title: "Add FAQ / Organization structured data",
        summary: "Structured data improves rich results and AI citation clarity.",
        whyItMatters:
          "Schema helps search and AI systems correctly interpret entities and answers.",
        businessImpact: "medium",
        seoImpact: "high",
        aiReadinessImpact: "high",
        difficulty: "easy",
        estimatedTime: "1–2 days",
        dependencies: [],
        nextSteps: [
          "Add Organization JSON-LD on homepage",
          "Add FAQPage where FAQs exist",
          "Validate with rich results testing",
        ],
        implementationLinks: [
          ...DEV_DOCS,
          { label: "AI Readiness", href: "/dashboard/ai-readiness" },
        ],
      }),
    );
  }

  if (!input.hasLlmsTxtHint) {
    recs.push(
      scored({
        kind: "ai_readiness",
        title: "Publish llms.txt for AI discoverability",
        summary: "An llms.txt file helps AI systems find authoritative pages on your site.",
        whyItMatters:
          "AI search readiness increasingly affects brand visibility beyond classic SEO.",
        businessImpact: "medium",
        seoImpact: "low",
        aiReadinessImpact: "high",
        difficulty: "easy",
        estimatedTime: "half day",
        dependencies: [],
        nextSteps: [
          "Generate llms.txt in AI Readiness",
          "Publish at site root",
          "Re-validate score",
        ],
        implementationLinks: [
          { label: "AI Readiness", href: "/dashboard/ai-readiness" },
          ...DEV_DOCS,
        ],
      }),
    );
  }

  for (const ent of input.entitiesRecommended.slice(0, 3)) {
    recs.push(
      scored({
        kind: "entity_coverage",
        title: `Strengthen entity: ${ent.label}`,
        summary: "Cover this entity to deepen topical authority in your Growth Graph™.",
        whyItMatters:
          "Entity coverage helps AI and search systems associate your brand with the right knowledge neighborhood.",
        businessImpact: "medium",
        seoImpact: "medium",
        aiReadinessImpact: "high",
        difficulty: "medium",
        estimatedTime: "3–5 days",
        dependencies: [],
        nextSteps: [
          `Create or expand content mentioning ${ent.label}`,
          "Link related products/services",
          "Add clarifying definitions",
        ],
        implementationLinks: DEV_DOCS,
      }),
    );
  }

  for (const title of input.competitorGapTitles.slice(0, 5)) {
    recs.push(
      scored({
        kind: "competitor_gap",
        title: `Competitor gap: ${title}`,
        summary: "Competitors appear to cover this area more clearly than your site.",
        whyItMatters:
          "Closing competitor content gaps recovers demand and improves relative MoneyGap Score™.",
        businessImpact: "high",
        seoImpact: "high",
        aiReadinessImpact: "medium",
        difficulty: "medium",
        estimatedTime: "1–2 weeks",
        dependencies: [],
        nextSteps: [
          "Audit competitor page depth",
          "Draft differentiated angle",
          "Publish and interlink",
        ],
        implementationLinks: DEV_DOCS,
        competition: 0.7,
        demandProxy: 0.6,
      }),
    );
  }

  for (const cluster of input.clusters.slice(0, 4)) {
    recs.push(
      scored({
        kind: "keyword_cluster",
        title: `Own topic cluster: ${cluster.label}`,
        summary: `Primary keyword “${cluster.primary}” with ${cluster.keywords.length} related terms (${cluster.intent}).`,
        whyItMatters:
          "Cluster ownership compounds rankings, AI answers, and pipeline from a single topic.",
        businessImpact: "medium",
        seoImpact: "high",
        aiReadinessImpact: "medium",
        difficulty: "medium",
        estimatedTime: "1–3 weeks",
        dependencies: [],
        nextSteps: [
          "Map cluster to pillar + supporting pages",
          "Align H1/H2s to intents",
          "Add internal links across cluster",
        ],
        implementationLinks: DEV_DOCS,
        intent: cluster.intent,
        demandProxy: cluster.demandProxy,
      }),
    );
  }

  recs.push(
    scored({
      kind: "missing_internal_links",
      title: "Improve internal link architecture",
      summary:
        "Connect money pages, guides, and FAQs so authority and conversion paths reinforce each other.",
      whyItMatters:
        "Internal links distribute equity, clarify site structure for crawlers and AI, and lift conversion paths.",
      businessImpact: "medium",
      seoImpact: "high",
      aiReadinessImpact: "medium",
      difficulty: "easy",
      estimatedTime: "2–3 days",
      dependencies: [],
      nextSteps: [
        "Map hub pages",
        "Add contextual links from blog → services",
        "Ensure pricing is reachable in ≤2 clicks",
      ],
      implementationLinks: DEV_DOCS,
    }),
  );

  return recs.sort((a, b) => b.opportunityScore - a.opportunityScore);
}
