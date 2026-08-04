import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

export const aeoAnalyzer: Analyzer = {
  id: "aeo",
  category: "aeo",
  async run(ctx) {
    const findings: Finding[] = [];
    const blobs = ctx.htmlSnippets.map((h) => h.content).join("\n");

    const hasJsonLd = /application\/ld\+json/i.test(blobs) || /"@type"\s*:/i.test(blobs);
    if (!hasJsonLd) {
      findings.push(
        finding({
          ruleId: "aeo/missing-structured-data",
          title: "Missing structured data",
          severity: "high",
          category: "aeo",
          explanation: "No JSON-LD / schema.org markup detected in scanned files.",
          recommendation: "Add Organization, WebSite, and page-type schema.",
          estimatedImpact: "Reduced AI and rich-result extractability.",
        }),
      );
    }

    if (!/"@type"\s*:\s*"FAQPage"/i.test(blobs) && !/FAQPage/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "aeo/missing-faq-schema",
          title: "Missing FAQ schema",
          severity: "high",
          category: "aeo",
          explanation: "FAQPage structured data not found.",
          recommendation: "Implement FAQPage JSON-LD for key Q&A content.",
          estimatedImpact: "Reduced AI search visibility.",
        }),
      );
    }

    if (!/"@type"\s*:\s*"Organization"/i.test(blobs) && !/Organization/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "aeo/missing-organization-schema",
          title: "Missing Organization schema",
          severity: "high",
          category: "aeo",
          explanation: "Organization entity schema not detected.",
          recommendation: "Add Organization JSON-LD with name, url, logo.",
          estimatedImpact: "Weaker entity clarity for AI systems.",
        }),
      );
    }

    if (!/"@type"\s*:\s*"BreadcrumbList"/i.test(blobs)) {
      findings.push(
        finding({
          ruleId: "aeo/missing-breadcrumb-schema",
          title: "Missing Breadcrumb schema",
          severity: "medium",
          category: "aeo",
          explanation: "BreadcrumbList schema not found.",
          recommendation: "Add BreadcrumbList JSON-LD on nested pages.",
          estimatedImpact: "Less clear site hierarchy for assistants.",
        }),
      );
    }

    const h1Count = (blobs.match(/<h1[\s>]/gi) ?? []).length;
    if (h1Count === 0) {
      findings.push(
        finding({
          ruleId: "aeo/missing-h1",
          title: "Missing semantic H1",
          severity: "medium",
          category: "aeo",
          explanation: "No H1 headings found in scanned templates.",
          recommendation: "Ensure one clear H1 per primary view.",
          estimatedImpact: "Weaker topic clarity for crawlers and AI.",
        }),
      );
    }

    // llms.txt presence/quality lives in the AI Readiness analyzer (avoid double-count)
    return findings;
  },
};
