import path from "node:path";
import { pathExists } from "../utils/fs.js";
import { finding } from "../rules/registry.js";
import type { Analyzer, Finding } from "../types/index.js";

function hasTag(html: string, re: RegExp): boolean {
  return re.test(html);
}

export const seoAnalyzer: Analyzer = {
  id: "seo",
  category: "seo",
  async run(ctx) {
    const findings: Finding[] = [];
    const blobs = ctx.htmlSnippets.map((h) => h.content).join("\n");

    if (!blobs || !hasTag(blobs, /<title[\s>]/i)) {
      findings.push(
        finding({
          ruleId: "seo/missing-title",
          title: "Missing title tags",
          severity: "high",
          category: "seo",
          explanation: "No <title> found in scanned HTML/templates.",
          recommendation: "Add unique, descriptive <title> tags per page.",
          estimatedImpact: "Weaker SERP relevance and click-through.",
        }),
      );
    }

    if (!hasTag(blobs, /name=["']description["']/i)) {
      findings.push(
        finding({
          ruleId: "seo/missing-meta-description",
          title: "Missing meta descriptions",
          severity: "medium",
          category: "seo",
          explanation: "No meta description tags detected.",
          recommendation: "Add unique meta descriptions (150–160 chars).",
          estimatedImpact: "Reduced SERP snippet quality.",
        }),
      );
    }

    if (!hasTag(blobs, /rel=["']canonical["']/i)) {
      findings.push(
        finding({
          ruleId: "seo/missing-canonical",
          title: "Missing canonical URLs",
          severity: "medium",
          category: "seo",
          explanation: "No canonical link tags found.",
          recommendation: "Add <link rel=\"canonical\"> on indexable pages.",
          estimatedImpact: "Duplicate content risk across URLs.",
        }),
      );
    }

    if (!hasTag(blobs, /property=["']og:/i)) {
      findings.push(
        finding({
          ruleId: "seo/missing-open-graph",
          title: "Missing Open Graph tags",
          severity: "low",
          category: "seo",
          explanation: "No Open Graph meta properties detected.",
          recommendation: "Add og:title, og:description, og:image.",
          estimatedImpact: "Weaker social and unfurl previews.",
        }),
      );
    }

    if (!hasTag(blobs, /name=["']twitter:/i)) {
      findings.push(
        finding({
          ruleId: "seo/missing-twitter-cards",
          title: "Missing Twitter Card tags",
          severity: "info",
          category: "seo",
          explanation: "No Twitter Card meta tags detected.",
          recommendation: "Add twitter:card and related tags.",
          estimatedImpact: "Suboptimal X/Twitter previews.",
        }),
      );
    }

    const robotsPaths = [
      path.join(ctx.projectRoot, "public", "robots.txt"),
      path.join(ctx.projectRoot, "robots.txt"),
    ];
    let hasRobots = false;
    for (const p of robotsPaths) {
      if (await pathExists(p)) {
        hasRobots = true;
        break;
      }
    }
    if (!hasRobots) {
      findings.push(
        finding({
          ruleId: "seo/missing-robots",
          title: "Missing robots.txt",
          severity: "medium",
          category: "seo",
          explanation: "No robots.txt found in public/ or project root.",
          recommendation: "Add a robots.txt with crawl guidance.",
          estimatedImpact: "Unclear crawl policy for bots.",
        }),
      );
    }

    const sitemapHints = [
      path.join(ctx.projectRoot, "public", "sitemap.xml"),
      path.join(ctx.projectRoot, "src", "app", "sitemap.ts"),
      path.join(ctx.projectRoot, "src", "app", "sitemap.js"),
      path.join(ctx.projectRoot, "app", "sitemap.ts"),
    ];
    let hasSitemap = false;
    for (const p of sitemapHints) {
      if (await pathExists(p)) {
        hasSitemap = true;
        break;
      }
    }
    if (!hasSitemap) {
      findings.push(
        finding({
          ruleId: "seo/missing-sitemap",
          title: "Missing sitemap",
          severity: "medium",
          category: "seo",
          explanation: "No sitemap.xml or app/sitemap.ts detected.",
          recommendation: "Generate a sitemap for indexable routes.",
          estimatedImpact: "Slower discovery of deep pages.",
        }),
      );
    }

    // Duplicate title heuristic
    const titles = [...blobs.matchAll(/<title[^>]*>([^<]*)<\/title>/gi)].map(
      (m) => m[1]!.trim().toLowerCase(),
    );
    const seen = new Set<string>();
    for (const t of titles) {
      if (!t) continue;
      if (seen.has(t)) {
        findings.push(
          finding({
            ruleId: "seo/duplicate-titles",
            title: "Duplicate metadata titles",
            severity: "medium",
            category: "seo",
            explanation: `Repeated title detected: "${t}"`,
            recommendation: "Ensure each page has a unique title.",
            estimatedImpact: "Cannibalization and weaker rankings.",
          }),
        );
        break;
      }
      seen.add(t);
    }

    return findings;
  },
};
