import type { LlmsGenerateInput } from "../types";

function list(items: string[] | undefined, fallback: string): string {
  if (!items?.length) return fallback;
  return items.map((i) => `- ${i}`).join("\n");
}

function urlList(
  items: { label: string; url: string }[] | undefined,
  fallback: string,
): string {
  if (!items?.length) return fallback;
  return items.map((i) => `- ${i.label}: ${i.url}`).join("\n");
}

function plainUrls(items: string[] | undefined, fallback: string): string {
  if (!items?.length) return fallback;
  return items.map((u) => `- ${u}`).join("\n");
}

/**
 * Generate a high-quality llms.txt Markdown guidance file.
 * Does not write to disk — callers enforce overwrite policy.
 */
export function generateLlmsFile(input: LlmsGenerateInput): string {
  const domain = input.domain.replace(/\/$/, "");
  const origin = domain.startsWith("http") ? domain : `https://${domain}`;
  const name = input.organizationName.trim() || "Organization";
  const updated =
    input.updatedAt ?? new Date().toISOString().slice(0, 10);

  const important =
    input.importantUrls?.length
      ? input.importantUrls
      : [
          { label: "Home", url: `${origin}/` },
          { label: "Pricing", url: `${origin}/pricing` },
          { label: "About", url: `${origin}/about` },
        ];

  const docs =
    input.documentationUrls?.length
      ? input.documentationUrls
      : [`${origin}/docs`];

  const knowledge =
    input.knowledgeUrls?.length
      ? input.knowledgeUrls
      : [`${origin}/blog`, `${origin}/academy`];

  const canonicals =
    input.canonicalResources?.length
      ? input.canonicalResources
      : [`${origin}/`, `${origin}/docs`, `${origin}/pricing`];

  const summary =
    input.summary?.trim() ||
    `${name} helps teams understand and close growth gaps across SEO, conversion, trust, and AI discoverability.`;

  const audience =
    input.audience?.trim() ||
    "Founders, growth marketers, agencies, and product teams running digital businesses.";

  return `# Organization

${name}

# Summary

${summary}

# Products

${list(input.products, `- ${name} platform`)}

# Services

${list(input.services, `- Growth intelligence analysis\n- Implementation guidance`)}

# Target Audience

${audience}

# Important URLs

${urlList(important, `- Home: ${origin}/`)}

# Documentation

${plainUrls(docs, `- ${origin}/docs`)}

# Knowledge Base

${plainUrls(knowledge, `- ${origin}/blog`)}

# FAQ

${input.faqUrl ? `- ${input.faqUrl}` : `- ${origin}/#faq`}

# Support

${input.supportUrl ? `- ${input.supportUrl}` : `- ${origin}/contact`}

# Contact

${input.contactUrl ? `- ${input.contactUrl}` : `- ${origin}/contact`}

# Preferred Canonical Resources

${plainUrls(canonicals, `- ${origin}/`)}

# Update Information

Last updated: ${updated}
Ruleset-aware guidance generated for AI crawlers and answer engines.
`;
}
