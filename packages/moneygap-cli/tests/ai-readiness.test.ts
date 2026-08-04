import { describe, expect, it } from "vitest";
import {
  calculateAIReadiness,
  detectKnowledgeResources,
  generateLlmsFile,
  validateLlmsFile,
} from "../src/ai-readiness/index.js";

const GOOD = `# Organization

MoneyGap AI

# Summary

Premium AI business growth intelligence platform for teams closing Money Gaps™.

# Products

- MoneyGap AI platform

# Services

- Website analysis
- Growth intelligence

# Target Audience

Founders and growth marketers.

# Important URLs

- Home: https://www.moneygap-ai.com/
- Pricing: https://www.moneygap-ai.com/pricing

# Documentation

- https://www.moneygap-ai.com/docs

# Knowledge Base

- https://www.moneygap-ai.com/academy

# FAQ

- https://www.moneygap-ai.com/#faq

# Support

- https://www.moneygap-ai.com/contact

# Contact

- https://www.moneygap-ai.com/contact

# Preferred Canonical Resources

- https://www.moneygap-ai.com/
- https://www.moneygap-ai.com/docs

# Update Information

Last updated: 2026-08-04
`;

describe("validateLlmsFile", () => {
  it("scores missing file as 0 with errors", () => {
    const r = validateLlmsFile(null);
    expect(r.score).toBe(0);
    expect(r.present).toBe(false);
    expect(r.errors.some((e) => e.ruleId === "llms/missing-file")).toBe(true);
  });

  it("scores a complete file highly", () => {
    const r = validateLlmsFile(GOOD);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.errors.length).toBe(0);
  });

  it("flags incomplete content", () => {
    const r = validateLlmsFile("# Organization\n\nAcme\n");
    expect(r.score).toBeLessThan(80);
    expect(r.warnings.length + r.errors.length).toBeGreaterThan(0);
  });
});

describe("generateLlmsFile", () => {
  it("emits required section headings", () => {
    const md = generateLlmsFile({
      organizationName: "Acme",
      domain: "acme.com",
    });
    expect(md).toContain("# Organization");
    expect(md).toContain("# Summary");
    expect(md).toContain("# Important URLs");
    expect(md).toContain("https://");
    const v = validateLlmsFile(md);
    expect(v.score).toBeGreaterThanOrEqual(70);
  });
});

describe("calculateAIReadiness", () => {
  it("penalizes missing llms", () => {
    const low = calculateAIReadiness({
      llmsPresent: false,
      llmsValidationScore: null,
      hasJsonLd: false,
      hasOrganizationSchema: false,
      hasFaqSchema: false,
      hasArticleSchema: false,
      hasSemanticHeadings: false,
      hasCanonical: false,
      hasContactTransparency: false,
      hasDocumentation: false,
      knowledgeResourceCount: 0,
    });
    const high = calculateAIReadiness({
      llmsPresent: true,
      llmsValidationScore: 90,
      hasJsonLd: true,
      hasOrganizationSchema: true,
      hasFaqSchema: true,
      hasArticleSchema: true,
      hasSemanticHeadings: true,
      hasCanonical: true,
      hasContactTransparency: true,
      hasDocumentation: true,
      knowledgeResourceCount: 4,
    });
    expect(high.score).toBeGreaterThan(low.score);
    expect(high.score).toBeGreaterThanOrEqual(80);
  });
});

describe("detectKnowledgeResources", () => {
  it("classifies docs and faq paths", () => {
    const found = detectKnowledgeResources([
      "https://x.com/docs",
      "https://x.com/faq",
      "https://x.com/",
    ]);
    expect(found.some((f) => f.kind === "docs")).toBe(true);
    expect(found.some((f) => f.kind === "faq")).toBe(true);
  });
});
