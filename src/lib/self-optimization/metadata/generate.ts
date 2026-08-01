import type { PageSeoSnapshot } from "../types";

export type MetadataProposal = {
  pageUrl: string;
  currentTitle: string | null;
  currentDescription: string | null;
  currentOg: Record<string, string>;
  currentTwitter: Record<string, string>;
  currentCanonical: string | null;
  currentJsonLd: unknown[];
  proposedTitle: string;
  proposedDescription: string;
  proposedOg: Record<string, string>;
  proposedTwitter: Record<string, string>;
  proposedCanonical: string;
  proposedJsonLd: unknown[];
  snippet: string;
};

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

export function proposeMetadata(
  page: PageSeoSnapshot,
  opts?: { brand?: string; productSummary?: string },
): MetadataProposal {
  const brand = opts?.brand ?? "MoneyGap AI";
  const summary =
    opts?.productSummary ??
    "Find the revenue your website is leaving on the table with AI Money Gap analysis.";

  const pathLabel = (() => {
    try {
      const p = new URL(page.url).pathname;
      if (p === "/" || p === "") return "Home";
      return p
        .split("/")
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" · ");
    } catch {
      return "Page";
    }
  })();

  const proposedTitle = truncate(
    page.title && page.title.length >= 20
      ? page.title
      : `${pathLabel} | ${brand} — AI Business Growth OS`,
    60,
  );

  const proposedDescription = truncate(
    page.metaDescription && page.metaDescription.length >= 50
      ? page.metaDescription
      : `${summary} Analyze any public site for Money Gaps, SEO gaps, and Fix Paths™.`,
    160,
  );

  const proposedCanonical = page.canonical || page.url;
  const proposedOg = {
    "og:title": proposedTitle,
    "og:description": proposedDescription,
    "og:url": proposedCanonical,
    "og:type": "website",
    "og:site_name": brand,
    ...(page.og["og:image"] ? { "og:image": page.og["og:image"] } : {}),
  };
  const proposedTwitter = {
    "twitter:card": page.twitter["twitter:card"] || "summary_large_image",
    "twitter:title": proposedTitle,
    "twitter:description": proposedDescription,
    ...(page.twitter["twitter:image"]
      ? { "twitter:image": page.twitter["twitter:image"] }
      : {}),
  };

  const proposedJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brand,
      url: (() => {
        try {
          return new URL(page.url).origin;
        } catch {
          return page.url;
        }
      })(),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: brand,
      applicationCategory: "BusinessApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: proposedDescription,
      url: page.url,
    },
  ];

  const snippet = `<!-- MoneyGap Metadata Engine™ proposal (preview only — confirm before apply) -->
<title>${proposedTitle}</title>
<meta name="description" content="${proposedDescription.replace(/"/g, "&quot;")}" />
<link rel="canonical" href="${proposedCanonical}" />
${Object.entries(proposedOg)
  .map(([k, v]) => `<meta property="${k}" content="${String(v).replace(/"/g, "&quot;")}" />`)
  .join("\n")}
${Object.entries(proposedTwitter)
  .map(([k, v]) => `<meta name="${k}" content="${String(v).replace(/"/g, "&quot;")}" />`)
  .join("\n")}
<script type="application/ld+json">
${JSON.stringify(proposedJsonLd, null, 2)}
</script>
`;

  return {
    pageUrl: page.url,
    currentTitle: page.title,
    currentDescription: page.metaDescription,
    currentOg: page.og,
    currentTwitter: page.twitter,
    currentCanonical: page.canonical,
    currentJsonLd: [],
    proposedTitle,
    proposedDescription,
    proposedOg,
    proposedTwitter,
    proposedCanonical,
    proposedJsonLd,
    snippet,
  };
}
