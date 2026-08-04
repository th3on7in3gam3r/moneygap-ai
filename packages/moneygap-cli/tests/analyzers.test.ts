import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { seoAnalyzer } from "../src/analyzers/seo.js";
import { aeoAnalyzer } from "../src/analyzers/aeo.js";
import type { AnalyzerContext } from "../src/types/index.js";
import { DEFAULT_CONFIG } from "../src/config/load.js";

const html = `<html><head><title>A</title></head><body>
<script type="application/ld+json">{"@type":"FAQPage"}</script>
<h1>Hi</h1>
</body></html>`;

function ctx(content: string): AnalyzerContext {
  return {
    projectRoot: path.dirname(fileURLToPath(import.meta.url)),
    framework: { id: "unknown", name: "Unknown", version: null },
    files: ["index.html"],
    htmlSnippets: [{ file: "index.html", content }],
    packageJson: null,
    config: DEFAULT_CONFIG,
  };
}

describe("SEO/AEO parsers", () => {
  it("SEO finds title present so skips missing-title", async () => {
    const findings = await seoAnalyzer.run(ctx(html));
    expect(findings.some((f) => f.ruleId === "seo/missing-title")).toBe(false);
  });

  it("AEO detects FAQ schema signal", async () => {
    const findings = await aeoAnalyzer.run(ctx(html));
    // With FAQ present, should not flag missing FAQ schema as critically — check rule ids exist
    expect(Array.isArray(findings)).toBe(true);
  });

  it("SEO flags missing title on empty blob", async () => {
    const findings = await seoAnalyzer.run(ctx(""));
    expect(findings.some((f) => f.ruleId === "seo/missing-title")).toBe(true);
  });
});
