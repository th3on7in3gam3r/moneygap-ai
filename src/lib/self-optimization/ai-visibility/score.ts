import type { PageSeoSnapshot, ScoreResult, SelfOptFindingInput, SiteFilesResult } from "../types";

export function scoreAiVisibility(
  pages: PageSeoSnapshot[],
  site: SiteFilesResult,
): ScoreResult {
  if (pages.length === 0) {
    return {
      score: null,
      unavailableReason: "No pages fetched — AI Visibility Score unavailable.",
      findings: [],
    };
  }

  const findings: SelfOptFindingInput[] = [];
  let points = 0;
  let max = 0;

  const add = (ok: boolean, w: number) => {
    max += w;
    if (ok) points += w;
  };

  add(site.robotsOk, 10);
  add(site.sitemapOk, 12);
  const withCanonical = pages.filter((p) => p.canonical).length;
  add(withCanonical >= Math.ceil(pages.length / 2), 10);
  const withJsonLd = pages.filter((p) => p.jsonLdTypes.length > 0);
  add(withJsonLd.length > 0, 18);
  if (withJsonLd.length === 0) {
    findings.push({
      category: "ai_visibility",
      title: "Weak machine-readable product identity",
      problem: "No JSON-LD detected for AI/search systems to ground the product.",
      businessImpact:
        "AI assistants may mis-describe MoneyGap or omit it from recommendations.",
      whyItMatters:
        "Structured Organization/SoftwareApplication data improves AI-assisted discovery.",
      estimatedOpportunity: 17000,
      estimateLabeled: "AI Estimate",
      confidence: 70,
      evidence: pages.slice(0, 3).map((p) => p.url),
      fixPath:
        "Add Organization + SoftwareApplication JSON-LD sitewide; FAQ schema on FAQ pages.",
      difficulty: "medium",
      estimatedTime: "3–6 hours",
      verificationSteps: ["JSON-LD present on home", "Rich Results Test"],
    });
  }

  const semantic = pages.filter((p) => p.hasMain && p.hasNav).length;
  add(semantic > 0, 12);
  if (semantic === 0) {
    findings.push({
      category: "ai_visibility",
      title: "Semantic HTML landmarks weak",
      problem: "Scanned pages lack <main>/<nav> landmarks.",
      businessImpact: "Harder for AI systems to segment page roles.",
      whyItMatters: "Clear structure improves extractability for assistants.",
      estimatedOpportunity: 5000,
      estimateLabeled: "AI Estimate",
      confidence: 58,
      evidence: pages.slice(0, 2).map((p) => p.url),
      fixPath: "Use semantic landmarks (header/nav/main/footer) on marketing layouts.",
      difficulty: "easy",
      estimatedTime: "2–4 hours",
      verificationSteps: ["Landmarks present in DOM"],
    });
  }

  add(pages.some((p) => p.h1.length > 0 && p.h2.length > 0), 10);
  add(pages.some((p) => Boolean(p.metaDescription)), 8);
  add(pages.some((p) => Boolean(p.og["og:title"])), 8);
  add(
    withJsonLd.some((p) =>
      p.jsonLdTypes.some((t) => /FAQPage|Organization|SoftwareApplication/i.test(t)),
    ),
    12,
  );

  return { score: Math.round((points / max) * 100), findings };
}
