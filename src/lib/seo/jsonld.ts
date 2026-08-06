import { absoluteUrl, getSiteOrigin } from "./site";
import { SITE_DEFAULT_DESCRIPTION } from "./metadata";

export type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function organizationJsonLd() {
  const origin = getSiteOrigin();
  const logoUrl = absoluteUrl("/logo.png");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: "MoneyGap AI",
    url: origin,
    description: SITE_DEFAULT_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
      contentUrl: logoUrl,
    },
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
  // AggregateRating / Review omitted until verifiable on-page reviews exist.
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

export type SiteReview = {
  authorName: string;
  reviewBody: string;
  ratingValue: number;
  datePublished?: string;
};

/**
 * Attach Review + AggregateRating only when real, visible reviews are supplied.
 * Empty input returns the base SoftwareApplication node (no invented ratings).
 */
export function softwareApplicationWithReviewsJsonLd(reviews: SiteReview[]) {
  const base = softwareApplicationJsonLd();
  if (reviews.length === 0) return base;

  const clamped = reviews.map((r) => ({
    ...r,
    ratingValue: Math.min(5, Math.max(1, r.ratingValue)),
  }));
  const avg =
    clamped.reduce((sum, r) => sum + r.ratingValue, 0) / clamped.length;

  return {
    ...base,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(avg.toFixed(1)),
      reviewCount: clamped.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: clamped.map((r) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: r.authorName,
      },
      reviewBody: r.reviewBody,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.ratingValue,
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.datePublished ? { datePublished: r.datePublished } : {}),
    })),
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
