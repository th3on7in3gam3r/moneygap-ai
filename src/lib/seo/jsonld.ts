import { absoluteUrl, getSiteOrigin } from "./site";
import { SITE_DEFAULT_DESCRIPTION } from "./metadata";

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function organizationJsonLd() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MoneyGap AI",
    url: origin,
    logo: absoluteUrl("/logo.png"),
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MoneyGap AI",
    url: origin,
    description: SITE_DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/academy/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MoneyGap AI",
    alternateName: [
      "MoneyGap",
      "developer-friendly conversion tool",
      "codebase growth audit",
    ],
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description:
      "Developer-friendly conversion tool and codebase growth audit. MoneyGap AI surfaces Money Gaps™ on public sites — SEO, conversion, trust, and AI visibility — then ships Fix Paths™. Free CLI sandbox via npx moneygap-scan; full MoneyGap Engine™ after signup.",
    keywords:
      "developer-friendly conversion tool, codebase growth audit, Money Gaps, Fix Paths, website revenue audit, CLI site scan, conversion optimization",
    featureList: [
      "Free live diagnostics sandbox and npx moneygap-scan CLI",
      "Money Gaps™ ranked by Opportunity Index™",
      "Fix Paths™ with human-in-the-loop review",
      "Growth Academy™ playbooks and engineering post-mortems",
      "Crawlability, schema, and performance-signal checks",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available; paid subscriptions for higher limits",
    },
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function faqPageJsonLd(
  faqs: { question: string; answer: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function jsonLdScript(nodes: unknown | unknown[]) {
  return JSON.stringify(nodes);
}
