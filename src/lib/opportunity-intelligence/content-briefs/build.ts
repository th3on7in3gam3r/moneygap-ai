import type {
  ContentBriefPayload,
  OiRecommendationDraft,
  SearchIntentKind,
} from "@/lib/opportunity-intelligence/types";

export function buildContentBrief(
  rec: OiRecommendationDraft,
  input: {
    audience?: string;
    services: string[];
    pageUrls: string[];
  },
): ContentBriefPayload {
  const intent: SearchIntentKind = rec.intent ?? "informational";
  return {
    suggestedTitle: rec.title.replace(/^(Create|Publish|Add|Strengthen|Own topic cluster:\s*)/i, "").trim() ||
      rec.title,
    description: rec.summary,
    targetAudience: input.audience || "Primary business buyers researching solutions",
    primaryIntent: intent,
    recommendedHeadings: [
      `What is ${rec.title.replace(/^[^:]+:\s*/, "")}?`,
      "Who it's for",
      "How it works",
      "Key benefits",
      "Common questions",
      "Next steps / CTA",
    ],
    suggestedFaqs: [
      "What does this include?",
      "How long does it take?",
      "Who is this for?",
      "How is this different from alternatives?",
    ],
    internalLinks: input.pageUrls.slice(0, 6),
    externalReferences: [
      "Industry standards documentation",
      "Comparable public case studies",
    ],
    schemaRecommendations:
      rec.kind === "missing_faq" || rec.kind === "missing_schema"
        ? ["FAQPage", "Organization"]
        : rec.kind === "missing_guide"
          ? ["Article", "BreadcrumbList"]
          : ["WebPage", "BreadcrumbList"],
    callsToAction: [
      input.services[0]
        ? `Talk to us about ${input.services[0]}`
        : "Book a discovery call",
      "View pricing",
      "Download related guide",
    ],
    successMetrics: [
      "Organic clicks to page",
      "Assisted conversions",
      "AI citation / brand mentions (qualitative)",
      "Time on page / scroll depth",
    ],
    implementationLinks: rec.implementationLinks,
  };
}
